/// <reference types="chrome"/>

import { AbsoluteCenter, Alert, AlertIcon, AlertTitle, Box, Button, ButtonGroup, Card, CardBody, CardHeader, Center, Checkbox, CircularProgress, Divider, Flex, Grid, HStack, IconButton, Input, ListItem, OrderedList, Select, SimpleGrid, Spinner, Stack, StackItem, Tab, TabList, TabPanel, TabPanels, Tabs, Text } from "@chakra-ui/react";
import { SetStateAction, useState } from "react";
import { ArrowBackIcon, ArrowForwardIcon, CalendarIcon, CheckIcon, ChevronLeftIcon, ChevronRightIcon, MinusIcon, SmallCloseIcon } from '@chakra-ui/icons';
import "./App.css"


const handleAuthClick = () => {
  chrome.runtime.sendMessage({ action: 'startAuthFlow' });
};

const testCreateEvent = () => {
  chrome.runtime.sendMessage({ action: 'createEvent' });
}

const getTimeZoneDescriptionFromPage = async (): Promise<string | null> => {
  const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (chrome.runtime.lastError) {
    console.error(chrome.runtime.lastError);
  }

  if (!activeTab || !activeTab.id) {
    console.error("Can't get active tab.");
    return null;
  }

  const [readTimeZoneDescriptionResult] = await chrome.scripting.executeScript({
    target: {
      tabId: activeTab.id,
    },
    func: () => {
      // This element is found on the SubItUp employee side nav and
      // should contain a text description of the user's time zone, like
      // "(GMT -6:00) CST/Central Standard".
      return document.getElementById("timezoneanchor")?.textContent || null;
    }
  });

  const timeZoneDescription = readTimeZoneDescriptionResult.result;

  if (!timeZoneDescription) {
    console.warn("Failed to find time zone description on page.");
  }

  return timeZoneDescription;
}


function App() {
  const [refresh, setRefresh] = useState(false);
  const [accessToken, setAccessToken] = useState('');
  const [SubItUpPayload, setSubItUpPayload] = useState('');
  const [SubItUpEvents, setSubItUpEvents] = useState([]);
  const [SubItUpFirstLoad, setSubItUpFirstLoad] = useState(false);
  const [uploadingEvents, setUploadingEvents] = useState(false);
  const [currentDateIndex, setCurrentDateIndex] = useState(0);
  const [currentDateRange, setCurrentDateRange] = useState("week");
  const [actionCooldown, setActionCooldown] = useState(false);

  const handleCooldown = () => {
    if (!actionCooldown) {
      setActionCooldown(true);
      setTimeout(() => {
        setActionCooldown(false);
      }, 2500); // Cooldown period in milliseconds (e.g., 5000ms = 5 seconds)
    }
  };

  const refreshExtension = () => {
    setRefresh(!refresh);
  }

  chrome.storage.local.get(null, function (data) {
    setAccessToken(data.accessToken);
    if (data.shifts !== undefined) {
      setSubItUpEvents(data.shifts);
      //setCheckedShifts(data.shifts.filter((shift: { [x: string]: boolean; }) => shift['addToGoogleCalendar'] == true)
      //.map((shift: { [x: string]: any; }) => shift['shiftid']));
      setSubItUpFirstLoad(true);
    }
    // Probably not necessary
    if (data.SubItUpRequiredRequestBody !== undefined) {
      setSubItUpPayload(data.SubItUpRequiredRequestBody);
    }
  });

  const logOut = () => {
    chrome.storage.local.clear(function () {
      // This callback function is optional and will be called after the data is cleared.
      if (chrome.runtime.lastError) {
        console.error(chrome.runtime.lastError);
      } else {
        console.log("chrome.storage.local data cleared successfully.");
        setAccessToken('');
        setSubItUpPayload(''); // Probably not necessary
        setSubItUpEvents([]);
        setSubItUpFirstLoad(false);
        setCheckedShifts([]);
        setUploadingEvents(false);
        setCurrentDateIndex(0);
        setCurrentDateRange("week");
        setActionCooldown(false);
      }
    });
    refreshExtension();
  }

  chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
    if (message.action == 'loggedOut') {
      //chrome.storage.local.set({ 'accessToken': message.token }, function () {
      //  console.log('Value is set to ' + message.token);
      //  setAccessToken(message.token);
      //});
      logOut();
    }
    if (message.action == "accessTokenRetrieved") {
      setAccessToken(message.accessToken);
    }
    if (message.action == 'startUploadingEvents') {
      setUploadingEvents(true);
    }
    if (message.action == 'endUploadingEvents') {
      setUploadingEvents(false);
    }
  });

  const MainApp = () => {
    const authorizationButton =
      <AbsoluteCenter axis='both'>
        <Text fontSize='2xl'>
          Once you login, please re-open the extension.
        </Text>
        <Button onClick={() => {
          handleAuthClick();
          refreshExtension();
        }}>Log Into Google Calendar</Button>
      </AbsoluteCenter>

    const test = <Button onClick={testCreateEvent}>Create Events</Button>

    const uploadingProgress =
      <Grid>
        <AbsoluteCenter axis='both'>
          <Text fontSize='3xl'>Uploading events to Google Calendar...</Text>
        </AbsoluteCenter>
        <AbsoluteCenter axis='both'>
          <Spinner size='xl' />
        </AbsoluteCenter>
      </Grid>

    if (accessToken === undefined) {
      return authorizationButton;
    }
    else if (uploadingEvents) {
      return uploadingProgress;
    }
    else {
      return shiftsList();
    }
  }

  /*
  if (checkedShifts !== undefined) {
    if (SubItUpEvents.length === 0) {
      setCheckedShifts(SubItUpEvents
        .filter((shift) => shift['addToGoogleCalendar'] === true)
        .map((shift) => shift['shiftid'])
      )
    }
  }
  */

  const addToGoogleCalendar = async () => {
    const timeZoneDescription = await getTimeZoneDescriptionFromPage();

    if (checkedShifts.length > 0) {
      chrome.runtime.sendMessage({ 
        action: 'uploadToGoogleCalendar',
        shiftIds: checkedShifts,
        shiftData: SubItUpEvents,
        timeZoneDescription,
        token: accessToken
      });
    }
  }

  const [checkedShifts, setCheckedShifts] = useState([]); //SubItUpEvents.filter((shift) => shift['addToGoogleCalendar'] == true).map((shift) => shift['shiftid']));

  const shiftsList = () => {
    const logoutButton = <Button colorScheme='red' onClick={logOut}>Logout</Button>
    if (SubItUpFirstLoad !== true || SubItUpPayload === '') {
      return (
        <Grid gap={4}>
          <Center>
            <CircularProgress isIndeterminate color='green.300' />
          </Center>
          <Alert
            status='info'
            variant='subtle'
            flexDirection='column'
            alignItems='center'
            justifyContent='center'
            textAlign='center'
            height='200px'>
            <AlertTitle fontSize='2xl'>How To Fetch Shifts:</AlertTitle>
            <OrderedList>
              <ListItem fontSize='xl'>Navigate to SubItUp.com</ListItem>
              <ListItem fontSize='xl'>Log in to SubItUp.com (If Not Already)</ListItem>
              <ListItem fontSize='xl'>Refresh The Page (On My Calendar)</ListItem>
              <ListItem fontSize='xl'>Re-open the extension.</ListItem>
            </OrderedList>
          </Alert>
          {logoutButton}
        </Grid>
      )
    }

    const submitButton = <Box>
      <Button colorScheme='blue' onClick={addToGoogleCalendar}>
        <Grid>
          <Text fontSize='2xl'>
            Add To Google Calendar
          </Text>
        </Grid>
      </Button>
      <Text fontSize='xs'>
        {"Failure will indicate having to re-login. (AccessToken Expired)"}
      </Text>
    </Box>


    function parseDateString(dateStr: string) {
      const [datePart, timePart] = dateStr.split(' ');
      const [year, month, day] = datePart.split('-').map(Number);
      const [hour, minute, second] = timePart.split(':').map(Number);

      return new Date(year, month - 1, day, hour, minute, second);
    }


    let shiftSelection = SubItUpEvents.length === 0 ? <Text fontSize='xl'>No Shifts.</Text> : (
      <>
        {
          /*
          <Stack spacing={5} direction='row'>
            <Button onClick={() => {
              let newCheckedShifts: SetStateAction<never[]> = [];
              SubItUpEvents.forEach((shift, idx, arr) => {
                if (shift['addToGoogleCalendar'] == true) {
                  newCheckedShifts = checkedShifts.concat([shift['shiftid']]);
                }
              })
              setCheckedShifts(newCheckedShifts);
              //refreshExtension();
            }}>Check All Assigned Shifts</Button>
          </Stack>
          */
        }
        <Stack spacing={3}>
          {SubItUpEvents.sort(
            function (shift_a, shift_b) {
              const dateA: any = parseDateString(shift_a['milstart']);
              const dateB: any = parseDateString(shift_b['milstart']);

              if (shift_a['addToGoogleCalendar'] == false) {
                return 1;
              }
              return dateA - dateB;
            }
          ).map((shift, idx) => (
            <StackItem>
              <Card variant={(shift['addToGoogleCalendar']) ? 'elevated' : 'filled'}>
                <CardHeader>
                  <Checkbox
                    size='lg'
                    colorScheme='green'
                    onChange={(e) => {
                      let index = checkedShifts.indexOf(shift['shiftid']);
                      if (index == -1) {
                        setCheckedShifts(checkedShifts.concat([shift['shiftid']]));
                      }
                      else {
                        setCheckedShifts(checkedShifts.filter((shiftid) => shiftid !== shift['shiftid']));
                      }
                    }}
                  >
                    {shift['ShiftName']}
                  </Checkbox>
                </CardHeader>
                <CardBody>
                  <Stack>
                    <StackItem>
                      <ChevronRightIcon />{shift['Title']}<ChevronLeftIcon />
                    </StackItem>
                    <StackItem>
                      <Box bg={(shift['addToGoogleCalendar']) ? 'green.100' : 'red.100'}>
                        {"Is this shift assigned to you? "}
                        {(shift['addToGoogleCalendar']) ? <CheckIcon /> : <SmallCloseIcon />}
                      </Box>
                    </StackItem>
                    <StackItem>
                      <CalendarIcon />
                      {"  "}
                      {shift['milend']}
                      {" "}
                      <MinusIcon />
                      {" "}
                      {shift['milstart']}
                    </StackItem>
                  </Stack>
                </CardBody>
              </Card>

            </StackItem>
          ))
          }
        </Stack >
      </>
    )

    let getBounds = (type: string, index: number) => {
      let date = new Date();
      const result = { startDate: new Date(date), endDate: new Date(date) };

      switch (type) {
        case 'day':
          result.startDate.setDate(result.startDate.getDate() + index);
          result.endDate.setDate(result.endDate.getDate() + index);
          break;
        case 'week':
          const currentDay = result.startDate.getDay();
          result.startDate.setDate(result.startDate.getDate() - currentDay + (index * 7));
          result.endDate.setDate(result.endDate.getDate() + (6 - currentDay) + (index * 7));
          break;
        case 'month':
          const currentMonth = result.startDate.getMonth();
          result.startDate.setMonth(currentMonth + index, 1);
          result.endDate.setMonth(currentMonth + index + 1, 0);
          break;
        default:
          throw new Error('Invalid type. Use "day", "week", or "month".');
      }

      const stringResult = { startDate: result.startDate.toLocaleDateString('en-US'), endDate: result.endDate.toLocaleDateString('en-US') }

      return stringResult;
    }


    let mainApp = (<>

      <Center>
        <HStack spacing={2} direction='row'>
          <IconButton
            icon={<ArrowBackIcon />}
            aria-label="Back"
            colorScheme="teal"
            isDisabled={actionCooldown}
            onClick={() => {
              setCurrentDateIndex(currentDateIndex - 1);
              handleCooldown();
              chrome.runtime.sendMessage({ action: 'refreshShifts', dateSettings: { range: currentDateRange, index: currentDateIndex - 1 } });
            }}
          />
          <Box p="4" borderWidth="1px" borderRadius="lg">
            <Text fontSize="lg" fontWeight="bold">
              {getBounds(currentDateRange, currentDateIndex).startDate} - {getBounds(currentDateRange, currentDateIndex).endDate}
            </Text>
          </Box>
          <IconButton
            icon={<ArrowForwardIcon />}
            aria-label="Forward"
            colorScheme="teal"
            isDisabled={actionCooldown}
            onClick={() => {
              setCurrentDateIndex(currentDateIndex + 1);
              handleCooldown();
              chrome.runtime.sendMessage({ action: 'refreshShifts', dateSettings: { range: currentDateRange, index: currentDateIndex + 1 } });
            }}
          />
        </HStack>
      </Center>

      <Box position='relative' padding='4'>
        <Divider />
        <AbsoluteCenter bg='white' px='1'>
          Shifts
        </AbsoluteCenter>
      </Box>
      {shiftSelection}
      < Center height='50px' >
        <Divider orientation='vertical' />
      </Center >
      {submitButton}
      < Center height='50px' >
        <Divider orientation='vertical' />
      </Center >
      {logoutButton}
    </>
    )

    let tabReload = false;
    let refreshSameTab = () => {
      if (!tabReload) {
        setCurrentDateIndex(0);
        handleCooldown();
        chrome.runtime.sendMessage({ action: 'refreshShifts', dateSettings: { range: currentDateRange, index: 0 } });
      }
    }

    return (
      <Grid>
        <Alert status='info'>
          <AlertIcon />
          Darkened Shifts are Available Shifts! (Not Taken).
        </Alert>

        <Box position='relative' padding='4'>
          <Divider />
          <AbsoluteCenter bg='white'>
            Change Date Range (Click Same Button to Refresh)
          </AbsoluteCenter>
        </Box>
        <Tabs variant='soft-rounded' colorScheme='green' defaultIndex={1} isFitted
          onChange={(index) => {
            tabReload = true;
            let type = "week";
            switch (index) {
              case 0:
                setCurrentDateRange("day");
                type = "day";
                break;
              case 1:
                setCurrentDateRange("week");
                type = "week";
                break;
              case 2:
                setCurrentDateRange("month");
                type = "month";
                break;
              default:
                setCurrentDateRange("week");
                break;
            }
            setCurrentDateIndex(0);
            handleCooldown();
            chrome.runtime.sendMessage({ action: 'refreshShifts', dateSettings: { range: type, index: 0 } });
            tabReload = false;
          }}>
          <TabList>
            <Tab onClick={() => {
              refreshSameTab();
            }} isDisabled={actionCooldown}>Day</Tab>
            <Tab onClick={() => {
              refreshSameTab();
            }} isDisabled={actionCooldown}>Week</Tab>
            <Tab onClick={() => {
              refreshSameTab();
            }} isDisabled={actionCooldown}>Month</Tab>
          </TabList>
          <TabPanels>
            <TabPanel>
              {mainApp}
            </TabPanel>
            <TabPanel>
              {mainApp}
            </TabPanel>
            <TabPanel>
              {mainApp}
            </TabPanel>
          </TabPanels>
        </Tabs>
      </Grid >

    );
  }
  return (
    <div className="App">
      {MainApp()}
      <Text>{"This extension was made By Christopher Kim (christopherkim2273@gmail.com)"}</Text>
    </div>
  );
}

export default App;
