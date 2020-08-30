import sinon from 'sinon';
import any from '@travi/any';
import {assert} from 'chai';
import * as configScaffolder from './config-scaffolder';
import {scaffold} from './index';

suite('travis', () => {
  let sandbox;
  const projectRoot = any.string();
  const vcs = {
    owner: any.word(),
    name: any.word()
  };

  setup(() => {
    sandbox = sinon.createSandbox();

    sandbox.stub(configScaffolder, 'default');

    configScaffolder.default.resolves();
  });

  teardown(() => sandbox.restore());

  test('that a base config is created for public a javascript project', async () => {
    const projectType = any.word();
    const visibility = 'Public';
    const tests = any.simpleObject();

    assert.deepEqual(
      await scaffold({
        projectRoot,
        vcs,
        visibility,
        tests,
        projectType
      }),
      {
        devDependencies: ['@travi/travis-lint'],
        scripts: {'disabled:lint:travis': 'travis-lint .travis.yml'},
        badges: {
          status: {
            ci: {
              img: `https://img.shields.io/travis/com/${vcs.owner}/${vcs.name}/master.svg`,
              link: `https://travis-ci.com/${vcs.owner}/${vcs.name}`,
              text: 'Build Status'
            }
          }
        },
        nextSteps: []
      }
    );
    assert.calledWith(configScaffolder.default, projectRoot, projectType, visibility, tests, vcs.owner);
  });

  test('that a badge is not defined and coverage is not reported for a private project', async () => assert.deepEqual(
    await scaffold({projectRoot, vcs, visibility: 'Private'}),
    {
      devDependencies: ['@travi/travis-lint'],
      scripts: {'disabled:lint:travis': 'travis-lint .travis.yml'},
      badges: {status: {}},
      nextSteps: [{summary: `Add Travis-CI badge from https://travis-ci.com/${vcs.owner}/${vcs.name} to README.md`}]
    }
  ));
});
