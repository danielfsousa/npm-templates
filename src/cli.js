const program = require('commander')
const prompts = require('prompts')
const pkg = require('../package.json')

program
  .version(pkg.version)
  .name('npm init @danielfsousa')
  .arguments('[template] [project-directory]')

const getQuestions = projects => [
  {
    type: 'select',
    name: 'template',
    message: 'Which template do you want to use?',
    choices: Object.keys(projects)
      .concat(['github repo'])
      .map(p => ({ title: p, value: p })),
    initial: 0
  },
  {
    type: prev => (prev === 'github repo' ? 'text' : null),
    name: 'templateUrl',
    message: 'Specify the download URL of the github repo:',
    initial: 'https://github.com/danielfsousa/monorepo-typescript-lib-starter/archive/main.zip'
  },
  {
    type: 'text',
    name: 'projectDirectory',
    message: 'Specify the project directory:',
    initial: 'my-app'
  }
]

async function run(projects) {
  program.parse(process.argv)
  const flags = program.opts()

  prompts.override({
    ...flags,
    ...{
      template: program.args[0],
      projectDirectory: program.args[1]
    }
  })

  const answers = await prompts(getQuestions(projects))
  answers.template = answers.template === 'github repo' ? answers.templateUrl : answers.template

  if (!answers.template || !answers.projectDirectory) {
    process.exit(1)
  }

  return { program, answers }
}

module.exports = { run }
