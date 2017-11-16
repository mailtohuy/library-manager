const inquirer = require('inquirer'),
    fs = require('fs'),
    xlsx = require('xlsx'),
    _ = require('underscore');

inquirer.prompt([
  {
    type: 'input',
    name: 'path',
    message: 'Path to inventory file:',
    default: './data/inventory.xlsx'
  },
  {
    type: 'list',
    name: 'command',
    message: 'What do you like to do?',
    choices: [
      { name: 'Search', value: 'search' }
    ],
    default: 'search'
  },
  {
    type: 'input',
    name: 'terms',
    message: 'Enter search terms:',
    when(session) {
      return (session.command === 'search')
    }
  },
]).then(session => {
  console.log(session);
});


function init(inventory_file) {
  const isCharger = /.*charger.*/i;
  const isCable = /.*cable.*/i;
  const isHotSpot = /.*hot.*spot.*/i;
  const isSimCard = /.*sim.*card*/i;
  const re = _.memoize( word => new RegExp(word.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'i') );
  
  const data = fs.readFileSync(inventory_file);
  var workbook = xlsx.read(new Uint8Array(data), { type: "array" });
  
  const statusSheet = xlsx.utils.sheet_to_json(workbook.Sheets['Status']);
  const userSheet = xlsx.utils.sheet_to_json(workbook.Sheets['Users']);
  const deviceSheet = xlsx.utils.sheet_to_json(workbook.Sheets['Devices']);
  
  var userList =
    _.chain(userSheet)
      .map(user => _.pick(user, 'UserId', 'Name', 'Email'))
      .groupBy('UserId')
      .value();
  
  var deviceList =
    _.chain(deviceSheet)
      .map(device => _.chain(device).pick('DeviceId', 'Manufacturer', 'Model', 'OSVersion').defaults({ 'OSVersion': '-' }).value())
      .groupBy('DeviceId')
      .value();
  
  var checkedOutList =
    _.chain(statusSheet)
      /* join with userList to add user info. Note: this mutates statusSheet */
      .map(checkedout => _.defaults(checkedout, _.pick(userList[checkedout['UserId']][0], 'Name', 'Email')))
      /* join with deviceList to add device info. Note: this mutates statusSheet */
      .map(checkedout => _.defaults(checkedout, _.pick(deviceList[checkedout['DeviceId']][0], 'Manufacturer', 'Model', 'OSVersion')))
      .value();
  
  var checkedOutDeviceIds = _.pluck(checkedOutList, 'DeviceId');
  
  function listavailableDevices() {
    return _.chain(deviceSheet)
    .filter(device => !isCharger.test(device['Model'])
      && !isCable.test(device['Model'])
      && !isHotSpot.test(device['Model'])
      && !isSimCard.test(device['Model'])
      && _.indexOf(checkedOutDeviceIds, device['Id']) < 0)
    .map(device => _.chain(device).defaults({ 'OS Version': '-' }).pick('Id', 'Manufacturer', 'Model', 'OS Version').value())
    .groupBy('OS Version')
    .value();
  }
  
  function isMatchedAnyValue (obj, searchTerm) {
      return _.any(_.keys(obj).map(key => re(searchTerm).test(obj[key])));
  }
  
  function search(searchPhrase, objectList) {
    return searchPhrase.split(' ').reduce( (list, searchTerm) => list.filter (obj => isMatchedAnyValue(obj, searchTerm)) , objectList );
  }


}

