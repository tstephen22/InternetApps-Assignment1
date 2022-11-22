//IMPORTS------------------------------------
const express = require('express')
const app = express() ;
const axios = require('axios')
const cors = require('cors')
const path = require('path')
//PATHING------------------------------------
let publicPath = path.resolve(__dirname, "public")
app.use(express.static(publicPath))
require('dotenv').config(); //using .env file for enviroment variables 
//CONSTANTS----------------------------------
const LOCATION_LIMIT = 1
const MAX_DAYS = 5; 
const UMBRELLA_THRESH = 0.5;
const MILD_RANGE = [12, 24]
const WEATHER_ERROR = 0;
const LOCATION_ERROR = 1;
const POLLUTION_ERROR = 2; 

//APP LISTENERS ------------------------------------------------------------------------------
app.use(cors())

app.listen(process.env.PORT || 3000, () => { 
    console.log("Now listening on PORT : " + process.env.PORT || 3000)
})

/*
    /api/city 
     - GET method listener for '/api/city'
     - Used by the entry bar in the client
     - Parses the city from the query and passes it to getCurrentWeatherCity()
     - If a valid city, calculates relevant data and passes back a response
     - Else, passes back an error code and message. 
*/
app.get('/api/city', (req, res) => {
    console.log('/api/city/ - REQUEST RECEIVED')
    const city = req.query.city 
    getCurrentWeatherCity(city)
    .then((data) => {
        let response = {}
        let weather5days = getWeatherAverageDays(data.weather, MAX_DAYS)
        response.weather = weather5days
        response.packUmbrella = packUmbrella(weather5days)
        response.packFor = packing(weather5days)
        response.wearMask = calculatePm(data.pollution)
        response.lat = data.lat
        response.lon = data.lon
        console.log('RESPONSE : --------------------------------')
        console.log(response)
        console.log('-------------------------------------------')
        res.send(response)
    })
    .catch(errCode =>{
        res.status(500)
        let msg; 
        if(errCode==WEATHER_ERROR) msg="Weather data not found."
        else if(errCode==LOCATION_ERROR) msg="Location not found."
        res.send({
            errCode: errCode, 
            msg: msg
        })
    })
})
/*
    /api/location
     - GET method listener for '/api/location'
     - Used when a new point is selected by the user on the map. 
     - Parses the latitude and longitude of selected location from the query and passes it to getCurrentWeatherLocation()
     - If there is data on the point, calculates relevant data and passes back a response
     - Else, passes back an error code and message. 
*/
app.get('/api/location', (req, res) =>{
    console.log('/api/location/ - REQUEST RECEIVED')
    const lat = req.query.lat
    const lon = req.query.lon
    getCurrentWeatherLocation(lat, lon)
    .then((data) => {
        let response = {}
        let weather5days = getWeatherAverageDays(data.weather, MAX_DAYS)
        response.weather = weather5days
        response.packUmbrella = packUmbrella(weather5days)
        response.packFor = packing(weather5days)
        response.wearMask = calculatePm(data.pollution)
        response.lat = data.lat
        response.lon = data.lon
        console.log('RESPONSE : --------------------------------')
        console.log(response)
        console.log('-------------------------------------------')
        res.send(response)
    })
    .catch(errCode =>{
        res.status(500)
        let msg; 
        if(errCode==WEATHER_ERROR) msg="Weather data not found."
        else if(errCode==LOCATION_ERROR) msg="Location not found."
        res.send({
            errCode: errCode, 
            msg: msg
        })
    })
})

//API REQUEST FUNCTIONS-------------------------------------------------------------------------------------------
/*
    getCurrentWeatherCity(location)
    - Takes in a city and makes a request to Open Weather API for the longitude and latitude. 
    - If successful, passes lat and lon to getCurrentWeatherLocation and passes back the returned data to resolve/reject. 
    - Else, sends back an error code and message (i.e. city not found)
*/
function getCurrentWeatherCity(location){
    return new Promise((resolve, reject) => {
        console.log('Sending request for location using LOCATION NAME : ' + location + ' and LIMIT : ' + LOCATION_LIMIT)
        axios.get(`http://api.openweathermap.org/geo/1.0/direct?q=${location}&limit=${LOCATION_LIMIT}&appid=${process.env.API_KEY}`)
        .then((response) => {
            if(response.data.length != 0){
                let name = response.data[0].name
                let lat = response.data[0].lat
                let lon = response.data[0].lon
                console.log('RESPONSE\nLocation : ' + name + ' Lat : ' + lat + ' Lon : ' + lon);
                getCurrentWeatherLocation(lat, lon)
                .then(weatherData => resolve(weatherData)) //Pass up the data to resolve 
                .catch(errCode => reject(errCode))  //Pass up error code to reject method 
            } else {
                console.log('ERROR: No data from Location.')
                reject(LOCATION_ERROR)
            }
        })
        .catch(err => {
            console.log('ERROR with request for LOCATION : ' + location)
            console.log(err)
            reject(LOCATION_ERROR)
        })
    })
}
/*
    getCurrentWeatherLocation(lat, lon)
     - Takes in a latitude and longitude and makes a request to the Open Weather API for the weather and the pollution. 
     - If there is a response, passes the data up to the resolve function. 
     - Else, if there is an error, passes an error code and message to the reject function. 
*/
function getCurrentWeatherLocation(lat, lon){
    return new Promise((resolve, reject) =>{
        console.log('Sending request for weather ... ')
        axios.get(`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${process.env.API_KEY}`)
        .then((weatherRes) => {
            if(weatherRes.data.length != 0){
                console.log('Done.')
                console.log('Sending request for pollution data ...')
                axios.get(`http://api.openweathermap.org/data/2.5/air_pollution/forecast?lat=${lat}&lon=${lon}&appid=${process.env.API_KEY}`)
                .then((pollutionData) =>{
                    if(pollutionData.data.length != 0){
                        console.log('Done.')
                        resolve({weather: weatherRes.data, pollution:pollutionData.data, lon: lon, lat:lat})
                    } else {
                        console.log('ERROR: No data from Pollution API for Location.')
                        resolve({weather: weatherRes.data, pollution:[], lon: lon, lat:lat})
                    }
                })
                .catch((err) =>{
                    console.log('ERROR: Error from Pollution API for Location.')
                    reject(POLLUTION_ERROR)
                })
            } else {
                console.log('ERROR: No data from Weather API for Location.')
                reject(WEATHER_ERROR)
            }
        })
        .catch(err => {
            console.log('WEATHER REQUEST ERROR :')
            console.log(err)
            reject(WEATHER_ERROR)
        })
    })
}

//AVERAGE WEATHER FUNCTIONS --------------------------------------------------------------------------------------
function computeModeWeather(weathers){
    weathers.sort()
    let keys = []
    let freq = []
    for(let i = 0 ; i < weathers.length; i++){
        if(keys.includes(weathers[i])) continue; //If we have already counted the frequency 
        let frequency = 0; 
        for(let j = 0; j < weathers.length; j++){
            if(weathers[i] == weathers[j]) frequency++; 
        }
        keys.push(weathers[i])
        freq.push(frequency)
    }
    const maxVal = freq.reduce((a, b) => Math.max(a, b), -Infinity);
    const index = freq.findIndex(e => e == maxVal)
    return keys[index] //Mode 
}

/*
    getAverageWeather(weather, currentAvg)
    - Manipulates the average given using the weather passed into it 
    - returns the new average 
*/ 
function getAverageWeather(weather, currentAvg){
    let newAvg = {}
    if(currentAvg == undefined){ 
        newAvg = {
            valueCount: 1,
            temp_max: weather.main.temp_max,
            temp_min: weather.main.temp_min, 
            temp: weather.main.temp,
            humidity: weather.main.humidity,
            rain_pop : weather.pop,
            rainfall: (weather.rain != undefined ? weather.rain['3h'] : 0),  
            wind: weather.wind.speed,
            weather: [weather.weather[0].main], 
            date: new Date(weather.dt_txt.split(' ')[0])
        } 
    } else {
        newAvg = {
            valueCount: currentAvg.valueCount+1, 
            temp_max: (weather.main.temp_max > currentAvg.temp_max ?  weather.main.temp_max : currentAvg.temp_max),
            temp_min: (weather.main.temp_min < currentAvg.temp_min ?  weather.main.temp_min : currentAvg.temp_min),
            temp: weather.main.temp+currentAvg.temp, 
            humidity: weather.main.humidity+currentAvg.humidity,
            rain_pop : weather.pop + currentAvg.rain_pop, 
            rainfall: (weather.rain != undefined ? weather.rain['3h'] : 0) + currentAvg.rainfall, 
            wind: weather.wind.speed + currentAvg.wind, 
            weather: [...currentAvg.weather, weather.weather[0].main],
            date: currentAvg.date
        }
    }
    return newAvg;
}

/*
    getWeatherAverageDays(weatherData, numberOfDays) 
    - Takes in the weather data from the Weather API and calculates the average weather for the number of days given. 
    - returns the weather average for the number of days given
*/
function getWeatherAverageDays(weatherData, numberOfDays){
    let weatherList = weatherData.list; 
    let averageWeathers = [] 
    let hourly_weather = []
    let dayCounter = 0; 
    let average; 
    //For each timestamp in the weather data 
    for(let i = 0; i < weatherList.length && dayCounter < numberOfDays; i++){
        let dayWeather = weatherList[i]
        hourly_weather.push(dayWeather)
        let day = new Date(dayWeather.dt_txt.split(' ')[0]) //Get the date 
        if(average == undefined) average = getAverageWeather(dayWeather, average); //For first iteration
        else if(day.getDate() == average.date.getDate()){ //If timestamp within current day 
            //Add current weather to average object 
            average = getAverageWeather(dayWeather, average)
        } else { //If not, then its a new day
            //Create day average object using the data in the average object and push to the averageWeathers array. 
            dayCounter++; 
            let dayAvg = {
                valueCount: average.valueCount, 
                temp: Math.round(average.temp/average.valueCount), 
                temp_max: Math.round(average.temp_max), 
                temp_min: Math.round(average.temp_min), 
                humidity: average.humidity/average.valueCount, 
                rain_pop : Math.round((average.rain_pop/average.valueCount).toFixed(2)*100), 
                rainfall: average.rainfall.toFixed(2),
                wind: (average.wind/average.valueCount).toFixed(2),
                weather : computeModeWeather(average.weather),
                date: average.date,
                day: getDay(average.date), 
                hourly_weather : hourly_weather
            }
            hourly_weather = []
            averageWeathers.push(dayAvg); 
            average = getAverageWeather(dayWeather, undefined)
        }
    }
    return averageWeathers; 
}
//POLLUTION FUNCTION-----------------------------------------------------------------------------
/*
    calculatePm
    - Returns true if pm2_5 for any of the timestamps goes above or equals 10. 
    - Returns false otherwise.
    - Used to determine if user should wear a mask. 
*/
function calculatePm(pollution){
    if(pollution.length === 0) return -1; //No info for pollution
    for(let i = 0; i < pollution.list.length; i++){
        if(pollution.list[i].components["pm2_5"] >= 10) return true
    }
    return false
}
//OTHER FUNCTIONS--------------------------------------------------------------------------------
//Goes throw date given and returns what day it is 
function getDay(date){
    let string = date.toString()
    let today = new Date().toDateString()
    if(date.toDateString() == today) return "Today"
    else if(string.includes("Mon")) return "Monday"
    else if(string.includes("Tue")) return "Tuesday"
    else if(string.includes("Wed")) return "Wednesday"
    else if(string.includes("Thu")) return "Thursday"
    else if(string.includes("Fri")) return "Friday"
    else if(string.includes("Sat")) return "Saturday"
    else if(string.includes("Sun")) return "Sunday"
}

//Determines if user should pack an umbrella
function packUmbrella(days){
    for(let i = 0 ; i < days.length; i++){
        if(days[i].rain_pop >= UMBRELLA_THRESH) return true; //If rain probability >= UMBRELLA_THRESH then pack an umbrella
    }
    return false; 
}

/*
    - Checks every day to see what threshold they fall under (Cold/Mild/Hot) and returns 
    the most frequent threshold.
    - Used to determine what weather the user should pack for.
*/
function packing(days){
    let cold = 0; let mild = 0; let hot = 0; 
    days.forEach((day) => {
        if(day.temp < MILD_RANGE[0]) cold++; 
        else if(day.temp >= MILD_RANGE[0] && day.temp <= MILD_RANGE[1]) mild++
        else hot++
    })
    if(cold > hot && cold > mild) return "Cold"
    else if (hot > cold && hot > mild) return "Hot"
    else if (mild > hot && mild > cold) return "Mild"
    else "Mild" // they are equal, then just back mildly 
}