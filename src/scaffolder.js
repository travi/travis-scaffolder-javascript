import writeYaml from '../third-party-wrappers/write-yaml';

export default async function ({projectRoot, vcs, visibility, packageType, nodeVersion}) {
  /* eslint-disable no-template-curly-in-string */
  await writeYaml(`${projectRoot}/.travis.yml`, {
    language: 'node_js',
    notifications: {email: false},
    ...'Package' === packageType && {branches: {except: ['/^v\\d+\\.\\d+\\.\\d+$/']}},
    ...'Private' === visibility && {before_install: 'echo "//registry.npmjs.org/:_authToken=${NPM_TOKEN}" >> .npmrc'},
    ...10.3 <= nodeVersion && {install: 'case $TRAVIS_BRANCH in greenkeeper*) npm i;; *) npm ci;; esac;'},
    before_script: [
      'Private' === visibility ? 'npm run greenkeeper:update-lockfile' : undefined,
      'npm ls >/dev/null'
    ].filter(Boolean),
    ...'Private' === visibility && {after_script: 'npm run greenkeeper:upload-lockfile'},
    ...'Public' === visibility && {after_success: 'npm run coverage:report'},
    ...'Package' === packageType && {deploy: {provider: 'script', skip_cleanup: true, script: 'npx semantic-release'}},
    env: {global: ['FORCE_COLOR=1', 'NPM_CONFIG_COLOR=always']}
  });
  /* eslint-enable no-template-curly-in-string */

  return {
    ...'Public' === visibility && {
      badge: {
        img: `https://img.shields.io/travis/${vcs.owner}/${vcs.name}.svg?branch=master`,
        link: `https://travis-ci.com/${vcs.owner}/${vcs.name}`,
        text: 'Build Status'
      }
    }
  };
}
