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
  });

  teardown(() => sandbox.restore());

  test('that a base config is created for a javascript project', () => {
    yamlWriter.default.resolves();

    return assert.becomes(
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
        install: ['npm install', 'gem install travis'],
        before_script: 'npm run greenkeeper:update-lockfile',
        after_script: 'npm run greenkeeper:upload-lockfile',
        env: {global: ['FORCE_COLOR=1', 'NPM_CONFIG_COLOR=always', 'GK_LOCK_COMMIT_AMEND=true']}
      }
    ));
  });

  test('that a badge is not defined for a private project', () => assert.becomes(
    scaffold({projectType: 'JavaScript', projectRoot, vcs, visibility: 'Private'}),
    {}
  ));
});
