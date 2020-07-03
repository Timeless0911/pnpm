import PnpmError from '@pnpm/error'
import { sync as canWriteToDir } from 'can-write-to-dir'
import path = require('path')
import PATH = require('path-name')

export default function (knownCandidates: string[] = []) {
  if (!process.env[PATH]) {
    throw new PnpmError('NO_PATH_ENV',
      `Couldn't find a global directory for executables because the "${PATH}" environment variable is not set.`)
  }
  const dirs = process.env[PATH]?.split(path.delimiter) ?? []
  const nodeBinDir = path.dirname(process.execPath)
  return pickBestGlobalBinDir(dirs, [
    ...knownCandidates,
    nodeBinDir,
  ])
}

const areDirsEqual = (dir1: string, dir2: string) =>
  path.relative(dir1, dir2) === ''

function pickBestGlobalBinDir (dirs: string[], knownCandidates: string[]) {
  const noWriteAccessDirs = [] as string[]
  for (const dir of dirs) {
    const lowCaseDir = dir.toLowerCase()
    if (
      isUnderDir('node', lowCaseDir) ||
      isUnderDir('nodejs', lowCaseDir) ||
      isUnderDir('npm', lowCaseDir) ||
      isUnderDir('pnpm', lowCaseDir) ||
      knownCandidates.some((candidate) => areDirsEqual(candidate, dir))
    ) {
      if (canWriteToDirAndExists(dir)) return dir
      noWriteAccessDirs.push(dir)
    }
  }
  if (noWriteAccessDirs.length === 0) {
    throw new PnpmError('NO_GLOBAL_BIN_DIR', "Couldn't find a suitable global executables directory.", {
      hint: `There should be a node, nodejs, npm, or pnpm directory in the "${PATH}" environment variable`,
    })
  }
  throw new PnpmError('GLOBAL_BIN_DIR_PERMISSION', 'No write access to the found global executable directories', {
    hint: `The found directories:
${noWriteAccessDirs.join('\n')}`,
  })
}

function isUnderDir (dir: string, target: string) {
  target = target.endsWith(path.sep) ? target : `${target}${path.sep}`
  return target.includes(`${path.sep}${dir}${path.sep}`) ||
    target.includes(`${path.sep}.${dir}${path.sep}`)
}

function canWriteToDirAndExists (dir: string) {
  try {
    return canWriteToDir(dir)
  } catch (err) {
    if (err.code !== 'ENOENT') throw err
    return false
  }
}