const inquirer = require('inquirer'),
    fs = require('fs'),
    xlsx = require('xlsx'),
    _ = require('underscore');

inquirer.prompt([
  {
    type: 'input',
    name: 'path',
    message: 'Path to inventory file:',
    when(session) {
      session.path = './inventory.xlsx';
      return !fs.existsSync(session.path);
    }
  },
  {
    type: 'input',
    name: 'terms',
    message: 'Search for:'
  },
]).then(session => {
  let libman = init(session.path);
  console.log(libman.search(session.terms));
});

function init(inventory_file) {
  const isCharger = /.*charger.*/i;
  const isCable = /.*cable.*/i;
  const isHotSpot = /.*hot.*spot.*/i;
  const isSimCard = /.*sim.*card*/i;
  const re = _.memoize( word => new RegExp(word.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'i') );
  
  const data = fs.readFileSync(inventory_file);
  var workbook = xlsx.read(new Uint8Array(data), { type: "array" });
  
  const statusSheet = xlsx.utils.sheet_to_json(workbook.Sheets['Status Log']);
  const userSheet = xlsx.utils.sheet_to_json(workbook.Sheets['Users']);
  const deviceSheet = xlsx.utils.sheet_to_json(workbook.Sheets['Devices-Phones']);
  
  var userList =
    _.chain(userSheet)
      .map(user => _.pick(user, 'User Id', 'First Name', 'Email'))
      .groupBy('User Id')
      .value();
  
  var deviceList =
    _.chain(deviceSheet)
      .map(device => _.chain(device).pick('Id', 'Manufacturer', 'Model', 'OS Version').defaults({ 'OS Version': '-' }).value())
      .groupBy('Id')
      .value();
  
  var checkedOutList =
    _.chain(statusSheet)
      /* join with userList to add user info. Note: this mutates statusSheet */
      .map(checkedout => _.defaults(checkedout, _.pick(userList[checkedout['User Id']][0], 'First Name', 'Email')))
      /* join with deviceList to add device info. Note: this mutates statusSheet */
      .map(checkedout => _.defaults(checkedout, _.pick(deviceList[checkedout['Device Id']][0], 'Manufacturer', 'Model', 'OS Version')))
      .value();
  
  var checkedOutDeviceIds = _.pluck(checkedOutList, 'Device Id');

  var availableDeviceList =  _.chain(deviceSheet)
    .filter(device =>  _.indexOf(checkedOutDeviceIds, device['Id']) < 0)
    .map(device => _.chain(device).defaults({ 'OS Version': '-' }).pick('Id', 'Manufacturer', 'Model', 'OS Version').value())
    // .groupBy('OS Version')
    .value();
    

  function search(searchPhrase, objectList) {

    function isMatchedAnyValue (obj, searchTerm) {
      return _.any(_.keys(obj).map(key => re(searchTerm).test(obj[key])));
    }

    return searchPhrase.split(' ')
    .map(term => term.replace('_',' '))
    .reduce( (list, searchTerm) => list.filter (obj => isMatchedAnyValue(obj, searchTerm)) , objectList );
  }

  return {
    search: terms => search(terms,availableDeviceList).concat(search(terms,checkedOutList))
  }; 

}

