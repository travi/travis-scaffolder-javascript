import writeYaml from '../third-party-wrappers/write-yaml';

const publishedVersionRegex = '/^v\\d+\\.\\d+\\.\\d+(-(alpha|beta)\\.\\d+(@(alpha|beta))?)?$/';

function nodeVersionIs8Above12(nodeVersion) {
  return 8.12 <= nodeVersion && 9 > nodeVersion;
}

function npmVersionIs6(nodeVersion) {
  return 10.3 <= nodeVersion || nodeVersionIs8Above12(nodeVersion);
}

function coverageShouldBeReported(visibility, tests) {
  return 'Public' === visibility && tests.unit;
}

function lockfileNeedsToBeUpdated(visibility) {
  return 'Private' === visibility;
}

function privateNpmTokenIsNeeded(visibility) {
  return 'Private' === visibility;
}

function cleanupInjectedToken(packageType) {
  return 'Package' === packageType ? 'rm .npmrc' : 'git checkout .npmrc';
}

export default function (projectRoot, packageType, visibility, nodeVersion, tests) {
  return writeYaml(`${projectRoot}/.travis.yml`, {
    language: 'node_js',
    notifications: {email: false},
    ...'Package' === packageType && {branches: {except: [publishedVersionRegex]}},
    ...privateNpmTokenIsNeeded(visibility) && {
      /* eslint-disable-next-line no-template-curly-in-string */
      before_install: 'echo "//registry.npmjs.org/:_authToken=${NPM_TOKEN}" >> .npmrc'
    },
    ...lockfileNeedsToBeUpdated(visibility) && npmVersionIs6(nodeVersion) && {
      install: 'case $TRAVIS_BRANCH in greenkeeper*) npm i;; *) npm ci;; esac;'
    },
    before_script: [
      lockfileNeedsToBeUpdated(visibility) ? 'npm run greenkeeper:update-lockfile' : undefined,
      'npm ls >/dev/null',
      privateNpmTokenIsNeeded(visibility) && cleanupInjectedToken(packageType)
    ].filter(Boolean),
    ...lockfileNeedsToBeUpdated(visibility) && {after_script: 'npm run greenkeeper:upload-lockfile'},
    ...coverageShouldBeReported(visibility, tests) && {after_success: 'npm run coverage:report'},
    ...'Package' === packageType && {
      deploy: {
        provider: 'script',
        skip_cleanup: true,
        script: 'npx semantic-release',
        on: {all_branches: true}
      }
    },
    env: {global: ['FORCE_COLOR=1', 'NPM_CONFIG_COLOR=always']}
  });
}
