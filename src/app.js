var UI = require('ui');
var ajax = require('ajax');

// Create a Card with title and subtitle
var card = new UI.Card({
  title:'Weather',
  subtitle:'Fetching...'
});

card.show();

navigator.geolocation.getCurrentPosition(foundLocation, noLocation);

var lat;
var lon;
var cityName = "Unknown";
var stateAbbr = "Unknown";

function foundLocation(position) {
  lat = position.coords.latitude;
  lon = position.coords.longitude;
  
  var GEOURL = 'http://maps.googleapis.com/maps/api/geocode/json?latlng=' + lat + ',' + lon;
  
  ajax(
    {
      url: GEOURL,
      type: 'json'
    },
    function(data) {
      // Success!
      console.log("Successfully fetched geolocation data!");
      
      if (data.results[0]) {
        for (var i = 0; i < data.results[0].address_components.length; i++) {
          var comptype = data.results[0].address_components[i].types[0];
          if (comptype === "locality") {
            cityName = data.results[0].address_components[i].short_name;
          } else if (comptype === "administrative_area_level_1")
            stateAbbr = data.results[0].address_components[i].short_name;
          }
        }
  
      // Show to user
      card.subtitle(cityName + ", " + stateAbbr);
      card.body('Loading UV...');

      var UVURL = 'http://iaspub.epa.gov/enviro/efservice/getEnvirofactsUVDAILY/CITY/' + cityName + '/STATE/' + stateAbbr + '/JSON';
      
      // Make the request
      ajax(
        {
          url: UVURL,
          type: 'json'
        },
        function(data) {
          // Success!
          console.log("Successfully fetched weather data!");
          console.log(UVURL);
      
          // Extract data
          var uv = data[0].UV_INDEX;
      
          // Show to user
          card.subtitle(cityName + ", " + stateAbbr);
          card.body('Current UV:' + uv);
        },
        function(error) {
          // Failure!
          console.log('Failed fetching weather data: ' + error);
        }
      );
            
    
    },
    function(error) {
      // Failure!
      console.log('Failed fetching geolocation data: ' + error);
    }    
  );
  
}

function noLocation() {

}

