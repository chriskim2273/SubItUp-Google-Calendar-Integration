/*
chrome.identity.launchWebAuthFlow(
    {
        url: 'https://accounts.google.com/o/oauth2/auth?response_type=token&redirect_uri=https://icgemimkglpigllgjognbnbelodmklph.chromiumapp.org/provider_cb&scope=https://www.googleapis.com/auth/calendar&client_id=697110159929-7j9hchi10p913lf69qtjnqkgjr9gd3o4.apps.googleusercontent.com',
        interactive: true,
        //https://icgemimkglpigllgjognbnbelodmklph.chromiumapp.org
        //https://icgemimkglpigllgjognbnbelodmklph.chromiumapp.org
        //https://icgemimkglpigllgjognbnbelodmklph.chromiumapp.org/provider_cb
        // Include your client_id and redirect_uri
        // obtained from the Google Cloud Console
    },
    function (redirectUrl) {
        if (chrome.runtime.lastError) {
            console.error(chrome.runtime.lastError);
            return;
        }

        // Parse the redirect URL to extract the access token
        const params = new URLSearchParams(redirectUrl.split('#')[1]);
        const accessToken = params.get('access_token');

        // You can now use the accessToken to make API requests to Google Calendar
        console.log('Access Token:', accessToken);
    }
);
*/


chrome.storage.local.get(null, function (data) {
    console.log(data);
});
chrome.storage.local.set({ 'Yo': 'Joe' }, function () {
    console.log('Value is set to ' + 'Joe');
});
chrome.storage.local.get(null, function (data) {
    console.log(data);
});

const checkUserAuth = (accessToken) => {
    return true
    const headers = {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
    };
    fetch("https://www.googleapis.com/oauth2/v1/tokeninfo", {
        method: 'GET',
        headers,
    })
        .then((response) => {
            if (!response.ok) {
                console.error('Authorization token no longer valid. Please log in again.');
                return false;
            }
            console.log('Authorization token is valid.');
            return true;
        })
        .catch((_) => {
            console.error('Authorization token no longer valid. Please log in again.');
            return true;
        });
}

if (!checkUserAuth()) {
    chrome.runtime.sendMessage({ action: 'loggedOut' });
}

const testCreateEvent = () => {
    //let accessToken = "ya29.a0AfB_byB5x03Mo5qS1XoPQ-oMZUpv8gdwRgK1wFPIkyxelvzclKBvsTdlKHRz67eKwYf3HNGlQA7xNL6YPmOcRE5w5Zw9A7b3uUoaw1ONj7p6Bvq2Bk2X7olTD12r9Ul_1llGG7pLkhr86mqswPMcjmsUv2EtxNrbk7muvgaCgYKAZkSARASFQHsvYls63Z0MwgjH-PMsVGIm43OmQ0173";
    // Your access token obtained through OAuth
    //accessToken = "ya29.a0AfB_byAtY9cPtrW6076KnD2HQCGdtivnflSRNaX8QudmDawVliSWyPD7przmk8aT9bBimerGVFY75nAJtRMDsj8tSV82URty2PfHZiQyzqJL4fdiX1Vjd6pt-Sw_DzsBPQdMveMZN2Z0MXUx9i5WeFluFxwLWSu8iVPnrwaCgYKAeYSARASFQHsvYlsMjSiBlBxkVafGvAMO8DGWg0173";

    // Define the event data in JSON format
    const eventData = {
        summary: 'Sample Event',
        description: 'This is a sample event created via API.',
        start: {
            dateTime: '2023-09-01T10:00:00',
            timeZone: 'America/New_York',
        },
        end: {
            dateTime: '2023-09-01T11:00:00',
            timeZone: 'America/New_York',
        },
    };

    // Define the API endpoint for creating an event
    const calendarApiUrl = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';

    // Set up the request headers
    const headers = {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
    };

    // Make a POST request to create the event
    fetch(calendarApiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(eventData),
    })
        .then((response) => {
            if (!response.ok) {
                if (response.status == 401) {
                    // Unauthorized, log the person out.
                }
                throw new Error(`Failed to create event. Status code: ${response.status}`);
            }
            return response.json();
        })
        .then((data) => {
            console.log('Event created successfully!');
            console.log(data);
        })
        .catch((error) => {
            console.error('Error:', error.message);
        });

}


const getCalendarId = async (calendarName, accessToken) => {
    const CALENDAR_LIST_URL = 'https://www.googleapis.com/calendar/v3/users/me/calendarList'
    const CALENDARS_URL = 'https://www.googleapis.com/calendar/v3/calendars/'

    const headers = {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    };

    let calendarId = await fetch(CALENDAR_LIST_URL, {
        method: 'GET',
        headers,
    }).then((response) => {
        if (!response.ok) {
            if (response.status == 401) {
                // Unauthorized, log the person out.
                chrome.runtime.sendMessage({ action: 'loggedOut' });
            }
            throw new Error(`Failed to check for user's calendars. Status code: ${response.status}`);
        }
        return response.json();
    })
        .then((data) => {
            let calendars = data?.items;
            for (let calendar in calendars) {
                calendar = calendars[calendar];
                if (calendar?.summary === calendarName) {
                    console.log("calendar found: ", calendar)
                    return calendar.id;
                }
            }
            return undefined;
        })
        .catch((error) => {
            console.error('Error Retrieving Calendar:', error.message);
            chrome.runtime.sendMessage({ action: 'loggedOut' });
            return undefined;
        })
    if (calendarId) {
        console.log("Found Calendar - ID: ", calendarId);
        return calendarId;
    }

    let newCalendarData = {
        'summary': calendarName,  // Customize the calendar name
        'timeZone': 'America/New_York' // Should this be allowed to be set by the user?
    }
    calendarId = await fetch(CALENDARS_URL, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(newCalendarData)
    }).then((response) => {
        if (!response.ok) {
            if (response.status == 401) {
                // Unauthorized, log the person out.
                chrome.runtime.sendMessage({ action: 'loggedOut' });
            }
            throw new Error(`Failed to create new calendar. Status code: ${response.status}`);
        }
        return response.json();
    })
        .then((data) => {
            console.log("Created new calendar! Name: ", calendarName);
            return data.id;
        })
        .catch((error) => {
            console.error('Error Creating New Calendar', error.message);
            chrome.runtime.sendMessage({ action: 'loggedOut' });
            return undefined;
        })

    return calendarId;
}

const createShiftEvents = async (shiftIds, shiftData, timeZoneDescription, accessToken) => {
    // ADD THIS AS A PARAMETER
    const calendarName = "SubItUp Shifts";

    // Shift start and end times are only given in terms of the user's
    // configured time zone on SubItUp, so time zone info needs to be included
    // when sending the event data to the Calendar API. Otherwise there's no way
    // for it to know whether a "9:00 am" shift is taking place at New York
    // City's 9:00 am or San Francisco's 9:00 am.
    //
    // The Calendar API requires a time zone for event times, so a fallback is
    // provided in case the SubItUp time zone can't be read or translated to an
    // AINA time zone for whatever reason.
    const ainaTimeZoneName = getAinaTimeZoneNameFromSubItUpTimeZoneDescription(timeZoneDescription) ?? "America/New_York";

    let shiftsToAddToCalendar = shiftData.filter((shift) => {
        let index = shiftIds.indexOf(shift['shiftid']);
        if (index != -1) {
            return true;
        }
        return false;
    });
    let shiftDataToAddToCalendar = shiftsToAddToCalendar.map((shift) => {
        return {
            summary: shift['ShiftName'],
            description: shift['HelpfulInfo'],
            start: {
                dateTime: shift['milstart'].replace(' ', 'T'),
                timeZone: ainaTimeZoneName,
            },
            end: {
                dateTime: shift['milend'].replace(' ', 'T'),
                timeZone: ainaTimeZoneName,
            }
        }
    });

    // Define the API endpoint for creating an event
    //const calendarApiUrl = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';
    const calendarApiUrl = 'https://www.googleapis.com/calendar/v3/calendars/';
    const calendarId = await getCalendarId(calendarName, accessToken);

    const sleep = (delay) => new Promise((resolve) => setTimeout(resolve, delay))
    // Set up the request headers
    const headers = {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
    };

    chrome.runtime.sendMessage({ action: 'startUploadingEvents' });
    for (const shiftData of shiftDataToAddToCalendar) {
        // Make a POST request to create the event
        fetch(calendarApiUrl + `${calendarId}/events`, {
            method: 'POST',
            headers,
            body: JSON.stringify(shiftData),
        })
            .then((response) => {
                if (!response.ok) {
                    if (response.status == 401) {
                        // Unauthorized, log the person out.

                        chrome.runtime.sendMessage({ action: 'loggedOut' });
                    }
                    throw new Error(`Failed to create event. Status code: ${response.status}`);
                }
                return response.json();
            })
            .then((data) => {
                console.log('Event created successfully!');
                console.log(data);
            })
            .catch((error) => {
                console.error('Error:', error.message);
                chrome.runtime.sendMessage({ action: 'loggedOut' });
            });
        await sleep(2000);
    }
    chrome.runtime.sendMessage({ action: 'endUploadingEvents' });
}

chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
    if (message.action === 'startAuthFlow') {
        handleAuthClick();
    }
    else if (message.action === 'createEvent') {
        testCreateEvent();
    }
    else if (message.action === 'uploadToGoogleCalendar') {
        console.log(message.shiftIds);
        createShiftEvents(message.shiftIds, message.shiftData, message.timeZoneDescription, message.token);
    }
    else if (message.action === 'refreshShifts') {
        let payload = undefined;
        chrome.storage.local.get(null, function (data) {
            payload = data.SubItUpRequiredRequestBody;
            requestUrl = data.SubItUpRequestURL;

            if (payload === undefined || requestUrl === undefined) {
                console.log('bruh moment!')
                return;
            }

            console.log(message);
            payload['startdate'] = getBounds(message.dateSettings.range, message.dateSettings.index).startDate;
            payload['enddate'] = getBounds(message.dateSettings.range, message.dateSettings.index).endDate;
            payload['GoogleCalendarExtensionRequest'] = true;
            console.log("Payload after new date bounds: ", payload);

            fetch(requestUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    // Add any other necessary headers
                },
                body: JSON.stringify(payload),
            })
                .then((response) => response.json())
                .then((responseData) => {
                    responseData.forEach((element, index, array) => {
                        element['ShiftName'] = element['ShiftName'].replace('%2f', ' / ');
                        let blockTitle = element['BlockTitle'].toLowerCase();
                        if (element['noStaffAssigned'] == 'false' &&
                            blockTitle.includes("working") &&
                            !blockTitle.includes("available")) {
                            array[index]['addToGoogleCalendar'] = true;
                            array[index]['noStaffAssigned'] = false;
                        }
                        else {
                            array[index]['addToGoogleCalendar'] = false;
                            array[index]['noStaffAssigned'] = false;
                        }
                    });
                    chrome.storage.local.set({ 'shifts': responseData }, function () {
                        // Encrypt and store the access token
                        console.log('shifts is set to ' + responseData[0].stringify());
                    });
                    console.log("Resent Request Response:", responseData);
                })
                .catch((error) => {
                    console.error("Error resending request:", error);

                });
        });
    }
});

function getWeekBounds(date) {
    const currentDay = date.getDay();
    const startDate = new Date(date);
    const endDate = new Date(date);

    startDate.setDate(startDate.getDate() - currentDay);

    endDate.setDate(endDate.getDate() + (6 - currentDay));

    return { startDate, endDate };
}

function getBounds(type, index) {
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

    return result;
}

const currentDate = new Date();
const { startDate, endDate } = getWeekBounds(currentDate);

// TODO: CONVERT IT SUCH THAT IT RETRIEVES THE SECRET AND STORES IT AND RETRIEVES EVENTS BASED ON DATE RANGE
// SPECIFIED BY USER --> Drop downs??

// Intercept network requests
let done = false;
chrome.webRequest.onBeforeRequest.addListener(
    (details) => {
        if (details.url.includes("GetEmployeeScheduleData")) {
            if (details.method === "POST" && details.type === "xmlhttprequest" && !details.GoogleCalendarExtensionRequest) {
                let payload = null;

                try {
                    // Extract payload from request body
                    payload = JSON.parse(decodeURIComponent(new TextDecoder().decode(details.requestBody.raw[0].bytes)));
                    console.log('Payload before dates removed: ', payload)
                    // Remove the start and end dates. (Only store the auth and other keys)
                    const { enddate, startdate, ...requiredRequestBody } = payload;
                    payload = requiredRequestBody;

                    // Store the SubItUp Access Token
                    chrome.storage.local.set({ 'SubItUpRequiredRequestBody': payload }, function () {
                        console.log('SubItUpRequiredRequestBody: ' + JSON.stringify(payload));
                    });

                    // Store the SubItUp Request URL
                    chrome.storage.local.set({ 'SubItUpRequestURL': details.url }, function () {
                        console.log('SubItUpRequestURL: ' + details.url);
                    });
                } catch (error) {
                    console.error("Error parsing payload:", error);
                }

                if (payload) {
                    if (done === false) {
                        done = true;
                        // Inform the background script to track the payload
                        console.log(payload);
                        payload['startdate'] = startDate;
                        payload['enddate'] = endDate;
                        fetch(details.url, {
                            method: details.method,
                            headers: {
                                "Content-Type": "application/json",
                                // Add any other necessary headers
                            },
                            body: JSON.stringify(payload),
                        })
                            .then((response) => response.json())
                            .then((responseData) => {
                                responseData.forEach((element, index, array) => {
                                    element['ShiftName'] = element['ShiftName'].replace('%2f', ' / ');
                                    let blockTitle = element['BlockTitle'].toLowerCase();
                                    if (element['noStaffAssigned'] == 'false' &&
                                        blockTitle.includes("working") &&
                                        !blockTitle.includes("available")) {
                                        array[index]['addToGoogleCalendar'] = true;
                                        array[index]['noStaffAssigned'] = false;
                                    }
                                    else {
                                        array[index]['addToGoogleCalendar'] = false;
                                        array[index]['noStaffAssigned'] = false;
                                    }
                                });
                                chrome.storage.local.set({ 'shifts': responseData }, function () {
                                    // Encrypt and store the access token
                                    console.log('shifts is set to ' + responseData[0].stringify());
                                });
                                console.log("Resent Request Response:", responseData);
                            })
                            .catch((error) => {
                                console.error("Error resending request:", error);
                                chrome.runtime.sendMessage({ action: 'loggedOut' });
                            });
                    }
                }
            }

        }
    },
    { urls: ["https://*.subitup.com/*"] },
    ["requestBody"]
);

const handleAuthClick = () => {
    try {
        chrome.identity.launchWebAuthFlow(
            {
                url: 'https://accounts.google.com/o/oauth2/auth?prompt=consent&response_type=token&redirect_uri=https://bpceepmanghbdihilafngmapgjmdfcek.chromiumapp.org/provider_cb&scope=https://www.googleapis.com/auth/calendar.app.created%20https://www.googleapis.com/auth/calendar.calendarlist.readonly&client_id=503892199444-r178r30ke3diei7fjgpr7d0pgcs1cfe8.apps.googleusercontent.com',
                interactive: true,
                //https://icgemimkglpigllgjognbnbelodmklph.chromiumapp.org
                //https://icgemimkglpigllgjognbnbelodmklph.chromiumapp.org
                //https://icgemimkglpigllgjognbnbelodmklph.chromiumapp.org/provider_cb
                // Include your client_id and redirect_uri
                // obtained from the Google Cloud Console
            },
            function (redirectUrl) {
                if (chrome.runtime.lastError) {
                    console.error(chrome.runtime.lastError);
                    return;
                }

                // Parse the redirect URL to extract the access token
                const params = new URLSearchParams(redirectUrl.split('#')[1]);
                const accessToken = params.get('access_token');
                // To store the access token
                chrome.runtime.sendMessage({ action: 'accessTokenRetrieved', token: accessToken });

                chrome.storage.local.set({ 'accessToken': accessToken }, function () {
                    // Encrypt and store the access token
                    console.log('Value is set to ' + accessToken);
                });

                // You can now use the accessToken to make API requests to Google Calendar
                console.log('Access Token:', accessToken);
            }
        );
    } catch (err) {
        chrome.runtime.sendMessage({ action: 'loggedOut' })
    }
};

// SubItUp doesn't provide the user's chosen time zone in the API, and the time
// zone description that's shown in the sidebar of the SubItUp UI is in a
// different format than the IANA time zone names that the Google Calendar API
// expects. So, we need to translate the SubItUp time zone description to an
// IANA time zone name.
// 
// As of December 2024, the time zone descriptions shown in the SubItUp UI look
// like, for example, "(GMT -6:00) CST/Central Standard" or
// "(GMT +10:00) AET/Australia Eastern".
const getAinaTimeZoneNameFromSubItUpTimeZoneDescription = (subItUpTimeZoneLabel) => {
    if (!subItUpTimeZoneLabel) {
        return null;
    }

    // Every SubItUp time zone description contains a unique three-letter
    // abbreviation (like "CST" or "AET"), which we can use to determine what
    // the corresponding AINA time zone should be. The abbreviation comes just
    // before a slash, so we can use that to find and extract it.
    const slashIndex = subItUpTimeZoneLabel.indexOf("/");
    const subItUpTzAbbreviation = subItUpTimeZoneLabel.substring(slashIndex - 3, slashIndex);

    const ianaTimeZoneName = subItUpTzAbbreviationToIanaTzName[subItUpTzAbbreviation];

    if (!ianaTimeZoneName) {
        console.warn(`Failed to map SubItUp time zone label to IANA time zone name. The label was: '${subItUpTimeZoneLabel}'`);
    }

    return ianaTimeZoneName ?? null;
}

const subItUpTzAbbreviationToIanaTzName = {
    "GMT": "Etc/GMT",
    "UTC": "Etc/UTC",
    "GMST": "Europe/London",
    "ECT": "Europe/Berlin",
    "EET": "Europe/Bucharest",
    "ART": "Africa/Cairo",
    "EAT": "Africa/Nairobi",
    "MET": "Asia/Tehran",
    "NET": "Asia/Tbilisi",
    "PLT": "Asia/Dubai",
    "AFT": "Asia/Kabul",
    "IST": "Asia/Kolkata",
    "BST": "Asia/Dhaka",
    "VST": "Asia/Ho_Chi_Minh",
    "CTT": "Asia/Shanghai",
    "JST": "Asia/Tokyo",
    "ACT": "Australia/Darwin",
    "AET": "Australia/Sydney",
    "SST": "Pacific/Guadalcanal",
    "NST": "Pacific/Auckland",
    "MIT": "Pacific/Pago_Pago",
    "HST": "Pacific/Honolulu",
    "AST": "America/Anchorage",
    "PST": "America/Los_Angeles",
    "PNT": "America/Phoenix",
    "MST": "America/Denver",
    "CST": "America/Chicago",
    "EST": "America/New_York",
    "IET": "America/Indiana/Indianapolis",
    "PRT": "America/Puerto_Rico",
    "CNT": "America/St_Johns",
    "AGT": "America/Argentina/Buenos_Aires",
    "BET": "America/Sao_Paulo",
    "CAT": "Atlantic/Cape_Verde"
}