import {projectTypeShouldBePublished} from '@form8ion/javascript-core';

import writeYaml from '../third-party-wrappers/write-yaml.js';

function privateNpmTokenIsNeeded(visibility) {
  return 'Private' === visibility;
}

function cleanupInjectedToken() {
  return 'rm .npmrc';
}

export default function (projectRoot, projectType, visibility, tests, account) {
  return writeYaml(`${projectRoot}/.travis.yml`, {
    version: '~> 1.0',
    notifications: {email: false},
    ...privateNpmTokenIsNeeded(visibility) && {
      /* eslint-disable-next-line no-template-curly-in-string */
      before_install: 'echo "//registry.npmjs.org/:_authToken=${NPM_TOKEN}" >> .npmrc'
    },
    import: [
      {source: 'form8ion/.travis-ci:node.yml'},
      ...projectTypeShouldBePublished(projectType)
        ? [{source: `${account}/.travis-ci:authenticated-semantic-release.yml`}]
        : []
    ],
    ...privateNpmTokenIsNeeded(visibility) && {before_script: [cleanupInjectedToken()]}
  });
}
