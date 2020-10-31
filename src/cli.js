const program = require('commander')
const prompts = require('prompts')
const pkg = require('../package.json')

program
  .version(pkg.version)
  // .name('npm init @danielfsousa') //
  .arguments('[template] [project-directory]')
  // TODO:
  .option('-y, --yes', 'Skip questions')

const getQuestions = projects => [
  {
    type: 'select',
    name: 'template',
    message: 'What template do you want to use?',
    choices: Object.keys(projects).map(p => ({ title: p, value: p })),
    initial: 0
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

  return { program, answers }
}

module.exports = { run }
