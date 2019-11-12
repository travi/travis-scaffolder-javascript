import writeYaml from '../third-party-wrappers/write-yaml';

const publishedVersionRegex = '/^v\\d+\\.\\d+\\.\\d+(-(alpha|beta)\\.\\d+(@(alpha|beta))?)?$/';

function coverageShouldBeReported(visibility, tests) {
  return 'Public' === visibility && tests.unit;
}

function privateNpmTokenIsNeeded(visibility) {
  return 'Private' === visibility;
}

function cleanupInjectedToken() {
  return 'rm .npmrc';
}

export default function (projectRoot, packageType, visibility, nodeVersion, tests) {
  return writeYaml(`${projectRoot}/.travis.yml`, {
    version: '~> 1.0',
    language: 'node_js',
    notifications: {email: false},
    ...'Package' === packageType && {branches: {except: [publishedVersionRegex]}},
    ...privateNpmTokenIsNeeded(visibility) && {
      /* eslint-disable-next-line no-template-curly-in-string */
      before_install: 'echo "//registry.npmjs.org/:_authToken=${NPM_TOKEN}" >> .npmrc'
    },
    before_script: ['npm ls >/dev/null', privateNpmTokenIsNeeded(visibility) && cleanupInjectedToken()].filter(Boolean),
    ...coverageShouldBeReported(visibility, tests) && {after_success: 'npm run coverage:report'},
    ...'Package' === packageType && {
      deploy: {
        provider: 'script',
        edge: true,
        script: 'npx semantic-release',
        on: {all_branches: true}
      }
    },
    env: {global: ['FORCE_COLOR=1', 'NPM_CONFIG_COLOR=always']}
  });
}
