import * as jsCore from '@form8ion/javascript-core';
import sinon from 'sinon';
import {assert} from 'chai';
import any from '@travi/any';
import * as yamlWriter from '../third-party-wrappers/write-yaml';
import scaffoldConfig from './config-scaffolder';

suite('config scaffolder', () => {
  let sandbox;
  const projectRoot = any.string();
  /* eslint-disable-next-line no-template-curly-in-string */
  const privateNpmTokenInjectionScript = 'echo "//registry.npmjs.org/:_authToken=${NPM_TOKEN}" >> .npmrc';
  const commonPrivateBeforeScriptScripts = ['rm .npmrc'];

  setup(() => {
    sandbox = sinon.createSandbox();

    sandbox.stub(yamlWriter, 'default');
    sandbox.stub(jsCore, 'projectTypeShouldBePublished');

    yamlWriter.default.resolves();
    jsCore.projectTypeShouldBePublished.returns(false);
  });

  teardown(() => sandbox.restore());

  test('that a base config is created for a javascript project', async () => {
    await scaffoldConfig(projectRoot, null, 'Public', {unit: true});

    assert.calledWith(
      yamlWriter.default,
      `${projectRoot}/.travis.yml`,
      {
        version: '~> 1.0',
        notifications: {email: false},
        import: [{source: 'form8ion/.travis-ci:node.yml'}]
      }
    );
  });

  suite('private project', () => {
    test('that a badge is not defined and coverage is not reported for a private project', async () => {
      await scaffoldConfig(projectRoot, null, 'Private');

      assert.calledWith(
        yamlWriter.default,
        `${projectRoot}/.travis.yml`,
        {
          version: '~> 1.0',
          notifications: {email: false},
          import: [{source: 'form8ion/.travis-ci:node.yml'}],
          before_install: privateNpmTokenInjectionScript,
          before_script: commonPrivateBeforeScriptScripts
        }
      );
    });
  });

  suite('publishing', () => {
    test('that projects that should be published use semantic-release', async () => {
      const account = any.word();
      const projectType = any.word();
      jsCore.projectTypeShouldBePublished.withArgs(projectType).returns(true);

      await scaffoldConfig(projectRoot, projectType, 'Private', any.simpleObject(), account);

      assert.calledWith(
        yamlWriter.default,
        `${projectRoot}/.travis.yml`,
        {
          version: '~> 1.0',
          notifications: {email: false},
          import: [
            {source: 'form8ion/.travis-ci:node.yml'},
            {source: `${account}/.travis-ci:authenticated-semantic-release.yml`}
          ],
          before_install: privateNpmTokenInjectionScript,
          before_script: commonPrivateBeforeScriptScripts
        }
      );
    });
  });
});
