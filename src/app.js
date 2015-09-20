var UI = require('ui');
var ajax = require('ajax');


main();

function main() {
  // Create a Card with title and subtitle
  var card = new UI.Card({
    title:'UV Index',
    subtitle:'Searching...'
  });
  
  card.show();
  
  navigator.geolocation.getCurrentPosition(foundLocation, noLocation);
  
  var lat;
  var lon;
  var cityName = "Unknown";
  var stateAbbr = "Unknown";
  var zipcode = "Unknown";
  var uv_now = "--";
  var uv_max = "--";
  var uv_alert = "--";
  var wasDailyCached = false;
  var wasHourlyCached = false;
  
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
        
        // Pull out city, state, and ZIP code
        if (data.results[0]) {
          for (var i = 0; i < data.results[0].address_components.length; i++) {
            var comptype = data.results[0].address_components[i].types[0];
            if (comptype === "locality") {
              cityName = data.results[0].address_components[i].short_name;
            } else if (comptype === "administrative_area_level_1") {
              stateAbbr = data.results[0].address_components[i].short_name;
            } else if (comptype === "postal_code") {
              zipcode = data.results[0].address_components[i].short_name;
            }
          }
        }
    
        // Show to user
        card.subtitle(cityName + ", " + stateAbbr);
        card.body('Loading UV...');
  
        // Initiate AJAX requests for UV data
        getHourlyUV_JSON(zipcode);
        getDailyUV_JSON(zipcode);
        
        // Build out card
        card.subtitle(cityName + ", " + stateAbbr);
        card.body('Current UV: ' + uv_now + '\nMax UV: ' + uv_max);
      
      },
      function(error) {
        // Failure!
        console.log('Failed fetching geolocation data: ' + error);
      }    
    );
    
  }
  
  // Empty function is location is not retrieved
  function noLocation() {
  
  }
  
  card.on('click', 'up', function() {
    console.log('Up clicked!');
  });
  
  card.on('click', 'down', function() {
    console.log('Down clicked!');
  });
  
  card.on('click', 'select', function() {
    console.log('Select clicked!');
  });
  
  // Callback for hourly UV data
  function hourlyUVHandler(data, isCached) {
    if (typeof isCached === 'undefined') { isCached = false; }
    
    var dateEPAFormat = getdateEPAFormat();
    console.log("Date: " + dateEPAFormat);

    uv_now = -1;
    // Extract data
    for (var i = 0; i < data.length; i++) {
      if (data[i].DATE_TIME === dateEPAFormat) {
        uv_now = data[i].UV_VALUE;
        if(!isCached) {
          // We found our data, so assume data is good and store it
          console.log('Storing hourlyUV: ' + JSON.stringify(data).substr(0,50) + '...');
          localStorage.setItem('hourlyUV', JSON.stringify(data));
          wasHourlyCached = true;
          updateCacheFlag();
        }
      }
    }
    card.subtitle(cityName + ", " + stateAbbr);
    card.body('Current UV: ' + uv_now + '\nMax UV: ' + uv_max);
  }
  
  // Callback for daily UV data
  function dailyUVHandler(data, isCached) {

    uv_max = -1;
    uv_alert = -1;
    // Extract data
    uv_max = data[0].UV_INDEX;
    uv_alert = data[0].UV_ALERT;
    if(!isCached) {
      // We found our data, so assume data is good and store it
      console.log('Storing dailyUV: ' + JSON.stringify(data).substr(0,50) + '...');
      localStorage.setItem('dailyUV', JSON.stringify(data));
      wasDailyCached = true;
      updateCacheFlag();
    }

    card.subtitle(cityName + ", " + stateAbbr);
    card.body('Current UV: ' + uv_now + '\nMax UV: ' + uv_max);
    
  }
  
  function updateCacheFlag() {
    if(wasHourlyCached && wasDailyCached) {
      localStorage.setItem('lastQuery', getdateMMDDYYYY() + zipcode);
      console.log("Cache is good");
    } else {
      localStorage.setItem('lastQuery', '--');
      console.log("Cache not ready");
    }
  }
  
  // Check whether cache contains our data
  function isCacheGood(zipcode) {
    var lastQuery = localStorage.getItem('lastQuery');
//    return false;
    if (!lastQuery || (lastQuery != getdateMMDDYYYY() + zipcode)) {
      console.log('Cache miss: ' + lastQuery);
      return false;
    }
    console.log('Cache hit: ' + lastQuery);
    return true;
  }
  
  // Logic to check cache and invoke hourly handler
  function getHourlyUV_JSON(zipcode) {
    var UVHOURLYURL = 'http://iaspub.epa.gov/enviro/efservice/getEnvirofactsUVHOURLY/ZIP/' + zipcode + '/JSON';
    var hourlyUV_STR = localStorage.getItem('hourlyUV');
    if(isCacheGood(zipcode) && hourlyUV_STR) {
      var hourlyUV_JSON = JSON.parse(hourlyUV_STR);
      hourlyUVHandler(hourlyUV_JSON, true);
    } else {
      getJSONData(UVHOURLYURL, hourlyUVHandler);
    }
  }

  // Logic to check cache and invoke daily handler
  function getDailyUV_JSON(zipcode) {
    var UVDAILYURL = 'http://iaspub.epa.gov/enviro/efservice/getEnvirofactsUVDAILY/ZIP/' + zipcode + '/JSON';
    var dailyUV_STR = localStorage.getItem('dailyUV');
    if(isCacheGood(zipcode) && dailyUV_STR) {
      var dailyUV_JSON = JSON.parse(dailyUV_STR);
      dailyUVHandler(dailyUV_JSON, true);
    } else {
      getJSONData(UVDAILYURL, dailyUVHandler);
    }
  }

  // JSON AJAX wrapper
  function getJSONData(URL, handler) {
        // Make the request
        ajax(
          {
            url: URL,
            type: 'json'
          },
          function(data) {
            console.log('Success: ' + URL);
            handler(data);
          },
          function(error) {
            console.log('Failed: (' + error + ')' + URL);
          }
        );

  }

  function getdateMMDDYYYY() {
    var d = new Date();
      
    return formatDate(d, 'MM/dd/yyyy');
  }
  
  function getdateEPAFormat() {
    var d = new Date();
      
    // SEP/17/2015 03 AM
    return formatDate(d, 'MMM/dd/yyyy hh TT').toUpperCase();
  }
  
  // http://stackoverflow.com/questions/14638018/current-time-formatting-with-javascript
  function formatDate(date, format, utc){
          var MMMM = ["\x00", "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
          var MMM = ["\x01", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
          var dddd = ["\x02", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
          var ddd = ["\x03", "Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
          function ii(i, len) { var s = i + ""; len = len || 2; while (s.length < len) s = "0" + s; return s; }
  
          var y = utc ? date.getUTCFullYear() : date.getFullYear();
          format = format.replace(/(^|[^\\])yyyy+/g, "$1" + y);
          format = format.replace(/(^|[^\\])yy/g, "$1" + y.toString().substr(2, 2));
          format = format.replace(/(^|[^\\])y/g, "$1" + y);
  
          var M = (utc ? date.getUTCMonth() : date.getMonth()) + 1;
          format = format.replace(/(^|[^\\])MMMM+/g, "$1" + MMMM[0]);
          format = format.replace(/(^|[^\\])MMM/g, "$1" + MMM[0]);
          format = format.replace(/(^|[^\\])MM/g, "$1" + ii(M));
          format = format.replace(/(^|[^\\])M/g, "$1" + M);
  
          var d = utc ? date.getUTCDate() : date.getDate();
          format = format.replace(/(^|[^\\])dddd+/g, "$1" + dddd[0]);
          format = format.replace(/(^|[^\\])ddd/g, "$1" + ddd[0]);
          format = format.replace(/(^|[^\\])dd/g, "$1" + ii(d));
          format = format.replace(/(^|[^\\])d/g, "$1" + d);
  
          var H = utc ? date.getUTCHours() : date.getHours();
          format = format.replace(/(^|[^\\])HH+/g, "$1" + ii(H));
          format = format.replace(/(^|[^\\])H/g, "$1" + H);
  
          var h = H > 12 ? H - 12 : H === 0 ? 12 : H;
          format = format.replace(/(^|[^\\])hh+/g, "$1" + ii(h));
          format = format.replace(/(^|[^\\])h/g, "$1" + h);
  
          var m = utc ? date.getUTCMinutes() : date.getMinutes();
          format = format.replace(/(^|[^\\])mm+/g, "$1" + ii(m));
          format = format.replace(/(^|[^\\])m/g, "$1" + m);
  
          var s = utc ? date.getUTCSeconds() : date.getSeconds();
          format = format.replace(/(^|[^\\])ss+/g, "$1" + ii(s));
          format = format.replace(/(^|[^\\])s/g, "$1" + s);
  
          var f = utc ? date.getUTCMilliseconds() : date.getMilliseconds();
          format = format.replace(/(^|[^\\])fff+/g, "$1" + ii(f, 3));
          f = Math.round(f / 10);
          format = format.replace(/(^|[^\\])ff/g, "$1" + ii(f));
          f = Math.round(f / 10);
          format = format.replace(/(^|[^\\])f/g, "$1" + f);
  
          var T = H < 12 ? "AM" : "PM";
          format = format.replace(/(^|[^\\])TT+/g, "$1" + T);
          format = format.replace(/(^|[^\\])T/g, "$1" + T.charAt(0));
  
          var t = T.toLowerCase();
          format = format.replace(/(^|[^\\])tt+/g, "$1" + t);
          format = format.replace(/(^|[^\\])t/g, "$1" + t.charAt(0));
  
          var tz = -date.getTimezoneOffset();
          var K = utc || !tz ? "Z" : tz > 0 ? "+" : "-";
          if (!utc)
          {
              tz = Math.abs(tz);
              var tzHrs = Math.floor(tz / 60);
              var tzMin = tz % 60;
              K += ii(tzHrs) + ":" + ii(tzMin);
          }
          format = format.replace(/(^|[^\\])K/g, "$1" + K);
  
          var day = (utc ? date.getUTCDay() : date.getDay()) + 1;
          format = format.replace(new RegExp(dddd[0], "g"), dddd[day]);
          format = format.replace(new RegExp(ddd[0], "g"), ddd[day]);
  
          format = format.replace(new RegExp(MMMM[0], "g"), MMMM[M]);
          format = format.replace(new RegExp(MMM[0], "g"), MMM[M]);
  
          format = format.replace(/\\(.)/g, "$1");
  
          return format;
      }
}