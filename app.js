const inquirer = require('inquirer');

inquirer.prompt([
	{
     type: 'input',
     name: 'path',
     message: 'Path to inventory file:',
     default: './inventory.xlsx'
	},
	{
     type: 'list',
     name: 'command',
     message: 'What do you like to do?',
     choices:[
       {name: 'Check out a device', value: 'checkout'},
       {name: 'Add a user', value: 'users'},
       {name: 'Add a device', value: 'devices'},
       {name: 'List availables', value: 'list'},
       {name: 'Find something', value: 'find'}
     ],
     default: 'find'
	},
	{
     type: 'input',
     name: 'device-id',
     message: 'Device ID:',
     when (answers) {
	return (answers.command === 'checkout')
     }
	},
	{
     type: 'input',
     name: 'user-id',
     message: 'User ID:',
     when (answers) {
	return (answers.command === 'checkout') && (answers['device-id'] != ''); 
     }
	},
	{
     type: 'input',
     name: 'terms',
     message: 'Enter search terms:',
     when (answers) {
	return (answers.command === 'find')
     }
	},
]).then(answers=>{
 console.log(answers);
});
