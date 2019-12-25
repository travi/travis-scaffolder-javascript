import writeYaml from '../third-party-wrappers/write-yaml';

function coverageShouldBeReported(visibility, tests) {
  return 'Public' === visibility && tests.unit;
}

function privateNpmTokenIsNeeded(visibility) {
  return 'Private' === visibility;
}

function cleanupInjectedToken() {
  return 'rm .npmrc';
}

export default function (projectRoot, projectType, visibility, tests, account) {
  return writeYaml(`${projectRoot}/.travis.yml`, {
    version: '~> 1.0',
    language: 'node_js',
    notifications: {email: false},
    ...privateNpmTokenIsNeeded(visibility) && {
      /* eslint-disable-next-line no-template-curly-in-string */
      before_install: 'echo "//registry.npmjs.org/:_authToken=${NPM_TOKEN}" >> .npmrc'
    },
    ...privateNpmTokenIsNeeded(visibility) && {before_script: [cleanupInjectedToken()]},
    ...coverageShouldBeReported(visibility, tests) && {after_success: 'npm run coverage:report'},
    ...'Package' === projectType && {import: [{source: `${account}/.travis-ci:authenticated-semantic-release.yml`}]},
    env: {global: ['FORCE_COLOR=1', 'NPM_CONFIG_COLOR=always']}
  });
}
