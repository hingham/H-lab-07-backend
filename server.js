'use strict';

const express = require('express');
const cors = require('cors');
const superagent = require('superagent');

require('dotenv').config();

const PORT = process.env.PORT;

const app = express();

app.use(cors());

//Takes in user location query and returns a formatted location data object to City Explorer front end.
app.get('/location', (request,response) => {
  searchLatLong(request.query.data)
    .then(locationData => response.send(locationData))
    .catch(error => handleError(error, response));  
});

//Takes in user location query, retrieves daily weather data from the Dark Sky API for the queried location,
// and serves formatted daily weather data to City Explorer front end application.
app.get('/weather', (request,response)=>{
  searchWeather(request.query.data)
    .then(weatherData => response.send(weatherData))
    .catch(error=> handleError(error, response));
});

// Takes in user location query, retrieves daily weather data from the Yelp API for the queried location,
// and serves formatted Yelp data to City Explorer front end application.
app.get('/yelp', (request, response) => {
  searchYelp(request.query.data)
    .then(yelpData => response.send(yelpData))
    .catch(error => handleError(error, response));
});

app.get('/movies', (request, response) => {
  searchMovieDB(request.query.data)
    .then(movieData => response.send(movieData))
    .catch(error => handleError(error));
})

//translate location query to latitude and longitude data
function searchLatLong(queryData){
  const mapsURL = `https://maps.googleapis.com/maps/api/geocode/json?address=${queryData}&key=${process.env.GEOCODE_API_KEY}`;
  return superagent.get(mapsURL)
    .then( data => {
      if(!data.body.results.length) {
        console.error(data);
        throw 'No maps data returned';
      } else {
        let location = new Location(data.body.results[0]);
        location.search_query = queryData;
        return location;
      }
    }).catch(error => console.error(error));
}

function searchWeather(queryData){
  const weatherURL = `https://api.darksky.net/forecast/${process.env.DARKSKY_API_KEY}/${queryData.latitude},${queryData.longitude}`;
  return superagent
    .get(weatherURL) 
    .then(weatherData => {
      if (!weatherData.body.daily.data) {
        throw 'weather data not retrieved';
      } else {
        const allDays = weatherData.body.daily.data.map(function(daysData, index) {
          return new DayWeather(daysData);
        });
        return allDays;
      }
    })
    .catch(error => handleError(error));
}

function searchYelp(queryData) {
  const yelpURL = `https://api.yelp.com/v3/businesses/search?location=${queryData.formatted_query}`;
  // latitude=${queryData.latitude},longitude=${queryData.longitude}`;
  return superagent
    .get(yelpURL) 
    .set('Authorization', `Bearer ${process.env.YELP_API_KEY}`)
    .then(yelpData => {
      if (!yelpData.body.businesses.length) {
        throw 'no businesses returned by yelp';
      } else {
        const yelpResults = yelpData.body.businesses.map(function(businessData) {
          return new YelpResult(businessData);
        });
        return yelpResults;
      }
    })
    .catch(error => handleError(error));
}

function searchMovieDB(queryData) {
  const city = queryData.formatted_query.split(',')[0];
  const movieDBURL = `https://api.themoviedb.org/3/search/movie?api_key=${process.env.MOVIE_API_KEY}&language=en-US&query=${city}&page=1&include_adult=false`;
  console.log('requesting data from movieDB');
  return superagent
    .get(movieDBURL)
    .then(movieData => {
      if (!movieData.body.results.length) {
        throw 'no businesses returned by movieDB';
      } else {
        const movieResults = movieData.body.results.map(function(movie) {
          return new MovieResult(movie);
        });
        console.log(movieResults);
        return movieResults;
      }
    })
    .catch(error => handleError(error));
}

//Constructor function for Location objects
function Location(data){
  this.formatted_query = data.formatted_address;
  this.latitude = data.geometry.location.lat;
  this.longitude = data.geometry.location.lng;
}

//Constructor function for DayWeather Objects - returns a forecast and formatted date string
function DayWeather(data){
  this.forecast = data.summary;
  this.time = dateFormatter(data.time);
  //allDays.push(this);
}

function YelpResult(data) {
  this.name = data.name;
  this.image_url = data.image_url;
  this.price = data.price;
  this.rating = data.rating;
  this.url = data.url;
}

function MovieResult(data) {
  this.title = data.title;
  this.overview = data.overview;
  this.average_votes = data.vote_average;
  this.total_votes = data.vote_count;
  this.image_url = `https://image.tmdb.org/t/p/w500${data.poster_path}`;
  this.popularity = data.popularity;
  this.released_on = data.release_date;
}

//Constructor function for APIError objects - returns a status and response
function APIError(status, response){
  this.status = status;
  this.responseText = response;
}

//Assistant function to the DayWeather constructor
function dateFormatter(epochTime){
  let translateTime = new Date(0);
  translateTime.setUTCSeconds(epochTime);
  return translateTime.toDateString();
}

function handleError(error) {
  console.error(error);
}

app.listen(PORT, () => console.log(`Application is up and listening on ${PORT}`));
