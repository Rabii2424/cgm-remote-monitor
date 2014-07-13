// NightScout server file

// NightScout is free software: you can redistribute it and/or modify it under the terms of the GNU
// General Public License as published by the Free Software Foundation, either version 3 of the
// License, or (at your option) any later version.

// NightScout is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without
// even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.

// You should have received a copy of the GNU General Public License along with NightScout.
// If not, see <http://www.gnu.org/licenses/>.

// Description: Basic web server to display data from Dexcom G4.  Requires a database that contains
// the Dexcom SGV data.

///////////////////////////////////////////////////
// DB Connection setup and utils
///////////////////////////////////////////////////

var env = require('./env')( );
var package = require('./package.json');
var store = require('./lib/storage')(env);
var pebble = require('./lib/pebble');


var express = require('express');

///////////////////////////////////////////////////
// api and json object variables
///////////////////////////////////////////////////
var entries = require('./lib/entries')(env.mongo_collection, store);
var settings = require('./lib/settings')(env.settings_collection, store);
var api = require('./lib/api')(env, store, entries, settings);
///////////////////////////////////////////////////

///////////////////////////////////////////////////
// setup http server
///////////////////////////////////////////////////
var PORT = env.PORT;
var THIRTY_DAYS = 2592000;

var app = express();
var appInfo = package.name + ' ' + package.version;
app.set('title', appInfo);
app.enable('trust proxy'); // Allows req.secure test on heroku https connections.

// Only allow access to the API if API_SECRET is set on the server.
if (env.api_secret) {
    var requireSSL = require('./lib/middleware/require-ssl')( );
    console.log("API_SECRET", env.api_secret);
    
    // Display an error when you're not using SSL.
    app.use('/api/v1', requireSSL);
    
    // Handle API requests.
    app.use('/api/v1', api); 
}

// pebble data
app.get('/pebble', servePebble);

// define static server
var staticFiles = express.static(env.static_files, {maxAge: THIRTY_DAYS * 1000});

// serve the static content
app.use(staticFiles);

// Handle errors with express's errorhandler, to display more readable error messages.
var errorhandler = require('errorhandler');
//if (process.env.NODE_ENV === 'development') {
  app.use(errorhandler());
//}

store(function ready ( ) {
  var server = app.listen(PORT);
  console.log('listening', PORT);

  ///////////////////////////////////////////////////
  // setup socket io for data and message transmission
  ///////////////////////////////////////////////////
  var websocket = require('./lib/websocket');
  var io = websocket(env, server, store);
});

///////////////////////////////////////////////////
// server helper functions
///////////////////////////////////////////////////

function servePebble(req, res) {
    req.with_entries = store.with_collection(env.mongo_collection);
    pebble.pebble(req, res);
    return;
}

///////////////////////////////////////////////////
///////////////////////////////////////////////////
