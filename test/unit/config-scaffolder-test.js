import sinon from 'sinon';
import {assert} from 'chai';
import any from '@travi/any';
import * as yamlWriter from '../../third-party-wrappers/write-yaml';
import scaffoldConfig from '../../src/config-scaffolder';

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
    await scaffoldConfig(projectRoot, null, 'Public', null, {unit: true});

    assert.calledWith(
      yamlWriter.default,
      `${projectRoot}/.travis.yml`,
      {
        language: 'node_js',
        notifications: {email: false},
        before_script: ['npm ls >/dev/null'],
        after_success: 'npm run coverage:report',
        env: {global: colorEnablingEnvironmentVariables}
      }
    );
  });

  test('coverage is not reported for a project that isnt unit tested', async () => {
    await scaffoldConfig(projectRoot, null, 'Public', null, {unit: false});

    assert.calledWith(
      yamlWriter.default,
      `${projectRoot}/.travis.yml`,
      {
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
    const regexToExcludePublishedVersionTagsFromBuilding = '/^v\\d+\\.\\d+\\.\\d+'
      + '(-(alpha|beta)\\.\\d+(@(alpha|beta))?)?$/';
    const configToPublishWithSemanticRelease = {
      provider: 'script',
      edge: true,
      script: 'npx semantic-release',
      on: {all_branches: true}
    };

    test('that packages get deployed with semantic-release, but tag builds are excluded', async () => {
      await scaffoldConfig(projectRoot, 'Package', 'Private');

      assert.calledWith(
        yamlWriter.default,
        `${projectRoot}/.travis.yml`,
        {
          language: 'node_js',
          notifications: {email: false},
          branches: {except: [regexToExcludePublishedVersionTagsFromBuilding]},
          before_install: privateNpmTokenInjectionScript,
          before_script: commonPrivateBeforeScriptScripts,
          deploy: configToPublishWithSemanticRelease,
          env: {global: colorEnablingEnvironmentVariables}
        }
      );
    });
  });
});
