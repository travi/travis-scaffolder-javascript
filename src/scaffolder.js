import writeYaml from '../third-party-wrappers/write-yaml';

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

export default async function ({projectRoot, vcs, visibility, packageType, nodeVersion, tests}) {
  /* eslint-disable no-template-curly-in-string */
  await writeYaml(`${projectRoot}/.travis.yml`, {
    language: 'node_js',
    notifications: {email: false},
    ...'Package' === packageType && {branches: {except: ['/^v\\d+\\.\\d+\\.\\d+$/']}},
    ...'Private' === visibility && {before_install: 'echo "//registry.npmjs.org/:_authToken=${NPM_TOKEN}" >> .npmrc'},
    ...lockfileNeedsToBeUpdated(visibility) && npmVersionIs6(nodeVersion) && {
      install: 'case $TRAVIS_BRANCH in greenkeeper*) npm i;; *) npm ci;; esac;'
    },
    before_script: [
      lockfileNeedsToBeUpdated(visibility) ? 'npm run greenkeeper:update-lockfile' : undefined,
      'npm ls >/dev/null'
    ].filter(Boolean),
    ...lockfileNeedsToBeUpdated(visibility) && {after_script: 'npm run greenkeeper:upload-lockfile'},
    ...coverageShouldBeReported(visibility, tests) && {after_success: 'npm run coverage:report'},
    ...'Package' === packageType && {deploy: {provider: 'script', skip_cleanup: true, script: 'npx semantic-release'}},
    env: {global: ['FORCE_COLOR=1', 'NPM_CONFIG_COLOR=always']}
  });
  /* eslint-enable no-template-curly-in-string */

  return {
    ...'Public' === visibility && {
      badge: {
        img: `https://img.shields.io/travis/com/${vcs.owner}/${vcs.name}/master.svg`,
        link: `https://travis-ci.com/${vcs.owner}/${vcs.name}`,
        text: 'Build Status'
      }
    }
  };
}
