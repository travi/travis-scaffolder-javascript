import sinon from 'sinon';
import any from '@travi/any';
import {assert} from 'chai';
import * as yamlWriter from '../../third-party-wrappers/write-yaml';
import {scaffold} from '../../src';

suite('travis', () => {
  let sandbox;
  const projectRoot = any.string();
  const vcs = {owner: any.word(), name: any.word()};

  setup(() => {
    sandbox = sinon.createSandbox();

    sandbox.stub(yamlWriter, 'default');

    yamlWriter.default.resolves();
  });

  teardown(() => sandbox.restore());

  test('that a base config is created for a javascript project', () => assert.becomes(
    scaffold({projectType: 'JavaScript', projectRoot, vcs, visibility: 'Public'}),
    {
      badge: {
        img: `https://img.shields.io/travis/${vcs.owner}/${vcs.name}.svg?branch=master`,
        link: `https://travis-ci.com/${vcs.owner}/${vcs.name}`,
        text: 'Build Status'
      }
    }
  ).then(() => assert.calledWith(
    yamlWriter.default,
    `${projectRoot}/.travis.yml`,
    {
      language: 'node_js',
      notifications: {email: false},
      before_script: ['npm run greenkeeper:update-lockfile', 'npm ls >/dev/null'],
      after_script: 'npm run greenkeeper:upload-lockfile',
      after_success: 'npm run coverage:report',
      env: {global: ['FORCE_COLOR=1', 'NPM_CONFIG_COLOR=always', 'GK_LOCK_COMMIT_AMEND=true']}
    }
  )));

  /* eslint-disable no-template-curly-in-string */
  test('that a badge is not defined and coverage is not reported for a private project', () => assert.becomes(
    scaffold({projectType: 'JavaScript', projectRoot, vcs, visibility: 'Private'}),
    {}
  ).then(() => assert.calledWith(
    yamlWriter.default,
    `${projectRoot}/.travis.yml`,
    {
      language: 'node_js',
      notifications: {email: false},
      before_install: 'echo "//registry.npmjs.org/:_authToken=${NPM_TOKEN}" >> .npmrc',
      before_script: ['npm run greenkeeper:update-lockfile', 'npm ls >/dev/null'],
      after_script: 'npm run greenkeeper:upload-lockfile',
      env: {global: ['FORCE_COLOR=1', 'NPM_CONFIG_COLOR=always', 'GK_LOCK_COMMIT_AMEND=true']}
    }
  )));

  test('that packages get deployed with semantic-release, but tag builds are excluded', () => assert.becomes(
    scaffold({projectType: 'JavaScript', projectRoot, vcs, visibility: 'Private', packageType: 'Package'}),
    {}
  ).then(() => assert.calledWith(
    yamlWriter.default,
    `${projectRoot}/.travis.yml`,
    {
      language: 'node_js',
      notifications: {email: false},
      branches: {except: ['/^v\\d+\\.\\d+\\.\\d+$/']},
      before_install: 'echo "//registry.npmjs.org/:_authToken=${NPM_TOKEN}" >> .npmrc',
      before_script: ['npm run greenkeeper:update-lockfile', 'npm ls >/dev/null'],
      after_script: 'npm run greenkeeper:upload-lockfile',
      deploy: {provider: 'script', skip_cleanup: true, script: 'npx semantic-release'},
      env: {global: ['FORCE_COLOR=1', 'NPM_CONFIG_COLOR=always', 'GK_LOCK_COMMIT_AMEND=true']}
    }
  )));
  /* eslint-enable no-template-curly-in-string */

  test(
    'that the installation command is directly controlled after node 10.5 since npm 6 is bundled, ' +
    'which defaults to the `npm ci` command',
    async () => {
      await scaffold({projectType: 'JavaScript', projectRoot, vcs, visibility: 'Public', nodeVersion: '10.3'});

      assert.calledWith(
        yamlWriter.default,
        `${projectRoot}/.travis.yml`,
        sinon.match({
          install: 'case $TRAVIS_BRANCH in greenkeeper*) npm i;; *) npm ci;; esac;'
        })
      );
    }
  );
});
