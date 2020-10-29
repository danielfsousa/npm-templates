const fs = require('fs-extra')
const path = require('path')
const got = require('got')
const chalk = require('chalk')
const Stream = require('stream')
const decompress = require('decompress')
const { spawnSync } = require('child_process')
const { promisify } = require('util')
const { sync: commandExistsSync } = require('command-exists')
const cli = require('./cli')

const pipeline = promisify(Stream.pipeline)

const projects = {
  'express-rest': 'https://github.com/danielfsousa/express-rest-boilerplate/archive/master.zip',
  'typescript-lib': 'https://github.com/danielfsousa/typescript-lib-starter/archive/main.zip',
  'monorepo-typescript-lib':
    'https://github.com/danielfsousa/monorepo-typescript-lib-starter/archive/main.zip'
}

async function main() {
  const { program, answers } = await cli.run(projects)
  const { template, projectDirectory } = answers
  const directory = path.resolve(projectDirectory)
  const zipfile = path.join(directory, `${template}.zip`)
  const appName = path.basename(directory)
  const url = projects[template]

  if (!url) {
    console.error(`${chalk.magenta(template)} is not a valid project`)
    program.helpInformation()
    process.exit(1)
  }

  fs.ensureDirSync(directory)
  if (!isSafeToCreateProjectIn(directory, appName)) {
    process.exit(1)
  }

  console.log(
    `\nBootstrapping template ${chalk.magentaBright(template)} in ${chalk.green(directory)}.\n`
  )

  console.log(`Downloading ${chalk.cyan(url)}...`)
  await downloadRepo(url, zipfile)

  console.log('Extracting files...')
  await decompress(zipfile, directory, { strip: 1 })
  fs.unlinkSync(zipfile)

  // TODO: find and replace names like @danielfsousa
  // and sets name and email fields in package.json from git config
  // it should update all packages if it's a monorepo

  if (commandExistsSync('git')) {
    console.log('Initializing git...')
    execCommand(['git', 'init'], { cwd: directory })
  }

  console.log('Installing dependencies...')
  installDependencies(directory)

  const initScript = findInitScript(directory)
  if (initScript) {
    console.log(`\nExecuting script ${chalk.cyan('init.js')}...`)
    execCommand(['node', initScript], { cwd: directory })
    console.log(`Deleting script ${chalk.cyan('init.js')}...`)
    fs.unlinkSync(initScript)
  }

  console.log(`\nDone! Created ${chalk.cyan(appName)} at ${chalk.green(directory)}\n`)
  execCommand(['npm', 'run'], { cwd: directory })
}

async function downloadRepo(url, directory) {
  await pipeline(got.stream(url), fs.createWriteStream(directory))
}

function installDependencies(directory) {
  execCommand(['npm', 'install'], { cwd: directory })
}

function execCommand([command, ...args], { cwd }) {
  const { error } = spawnSync(command, args, { cwd, stdio: 'inherit' })
  if (error) throw error
}

function findInitScript(directory) {
  const paths = [path.join(directory, 'init.js'), path.join(directory, 'scripts', 'init.js')]
  return paths.map(fs.existsSync).find(Boolean)
}

function isSafeToCreateProjectIn(directory, name) {
  const validFiles = [
    '.DS_Store',
    '.git',
    '.gitattributes',
    '.gitignore',
    '.gitlab-ci.yml',
    '.hg',
    '.hgcheck',
    '.hgignore',
    '.idea',
    '.npmignore',
    '.travis.yml',
    'docs',
    'LICENSE',
    'README.md',
    'mkdocs.yml',
    'Thumbs.db'
  ]

  // These files should be allowed to remain on a failed install, but then
  // silently removed during the next create.
  const errorLogFilePatterns = ['npm-debug.log', 'yarn-error.log', 'yarn-debug.log']
  const isErrorLog = file => {
    return errorLogFilePatterns.some(pattern => file.startsWith(pattern))
  }

  const conflicts = fs
    .readdirSync(directory)
    .filter(file => !validFiles.includes(file))
    // Don't treat log files from previous installation as conflicts
    .filter(file => !isErrorLog(file))

  if (conflicts.length > 0) {
    console.log(`\nThe directory ${chalk.green(name)} contains files that could conflict:\n`)
    for (const file of conflicts) {
      try {
        const stats = fs.lstatSync(path.join(directory, file))
        if (stats.isDirectory()) {
          console.log(`  ${chalk.blue(`${file}/`)}`)
        } else {
          console.log(`  ${file}`)
        }
      } catch (e) {
        console.log(`  ${file}`)
      }
    }
    console.log()
    console.log('\nEither try using a new directory name, or remove the files listed above.')

    return false
  }

  // Remove any log files from a previous installation.
  fs.readdirSync(directory).forEach(file => {
    if (isErrorLog(file)) {
      fs.removeSync(path.join(directory, file))
    }
  })

  return true
}

module.exports = main
