import sinon from 'sinon';
import {assert} from 'chai';
import any from '@travi/any';
import * as yamlWriter from '../third-party-wrappers/write-yaml';
import scaffoldConfig from './config-scaffolder';

suite('config scaffolder', () => {
  let sandbox;
  const projectRoot = any.string();
  const colorEnablingEnvironmentVariables = ['FORCE_COLOR=1', 'NPM_CONFIG_COLOR=always'];
  /* eslint-disable-next-line no-template-curly-in-string */
  const privateNpmTokenInjectionScript = 'echo "//registry.npmjs.org/:_authToken=${NPM_TOKEN}" >> .npmrc';
  const commonPrivateBeforeScriptScripts = ['npm ls >/dev/null', 'rm .npmrc'];

  setup(() => {
    sandbox = sinon.createSandbox();

    sandbox.stub(yamlWriter, 'default');

    yamlWriter.default.resolves();
  });

  teardown(() => sandbox.restore());

  test('that a base config is created for a javascript project', async () => {
    await scaffoldConfig(projectRoot, null, 'Public', {unit: true});

    assert.calledWith(
      yamlWriter.default,
      `${projectRoot}/.travis.yml`,
      {
        version: '~> 1.0',
        language: 'node_js',
        notifications: {email: false},
        before_script: ['npm ls >/dev/null'],
        after_success: 'npm run coverage:report',
        env: {global: colorEnablingEnvironmentVariables}
      }
    );
  });

  test('coverage is not reported for a project that isnt unit tested', async () => {
    await scaffoldConfig(projectRoot, null, 'Public', {unit: false});

    assert.calledWith(
      yamlWriter.default,
      `${projectRoot}/.travis.yml`,
      {
        version: '~> 1.0',
        language: 'node_js',
        notifications: {email: false},
        before_script: ['npm ls >/dev/null'],
        env: {global: colorEnablingEnvironmentVariables}
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
          language: 'node_js',
          notifications: {email: false},
          before_install: privateNpmTokenInjectionScript,
          before_script: commonPrivateBeforeScriptScripts,
          env: {global: colorEnablingEnvironmentVariables}
        }
      );
    });
  });

  suite('package', () => {
    test('that packages get deployed with semantic-release, but tag builds are excluded', async () => {
      const account = any.word();

      await scaffoldConfig(projectRoot, 'Package', 'Private', any.simpleObject(), account);

      assert.calledWith(
        yamlWriter.default,
        `${projectRoot}/.travis.yml`,
        {
          version: '~> 1.0',
          language: 'node_js',
          notifications: {email: false},
          before_install: privateNpmTokenInjectionScript,
          before_script: commonPrivateBeforeScriptScripts,
          import: [{source: `${account}/.travis-ci:authenticated-semantic-release.yml`}],
          env: {global: colorEnablingEnvironmentVariables}
        }
      );
    });
  });
});
