import sinon from 'sinon';
import any from '@travi/any';
import {assert} from 'chai';
import * as yamlWriter from '../../third-party-wrappers/write-yaml';
import {scaffold} from '../../src';

suite('travis', () => {
  let sandbox;
  const projectRoot = any.string();
  const vcs = {owner: any.word(), name: any.word()};
  const colorEnablingEnvironmentVariables = ['FORCE_COLOR=1', 'NPM_CONFIG_COLOR=always'];
  /* eslint-disable-next-line no-template-curly-in-string */
  const privateNpmTokenInjectionScript = 'echo "//registry.npmjs.org/:_authToken=${NPM_TOKEN}" >> .npmrc';
  const privateBeforeScriptScripts = [
    'npm run greenkeeper:update-lockfile',
    'npm ls >/dev/null',
    'git checkout .npmrc'
  ];

  setup(() => {
    sandbox = sinon.createSandbox();

    sandbox.stub(yamlWriter, 'default');

    yamlWriter.default.resolves();
  });

  teardown(() => sandbox.restore());

  test('that a base config is created for a javascript project', () => assert.becomes(
    scaffold({projectType: 'JavaScript', projectRoot, vcs, visibility: 'Public', tests: {unit: true}}),
    {
      badge: {
        img: `https://img.shields.io/travis/com/${vcs.owner}/${vcs.name}/master.svg`,
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
      before_script: ['npm ls >/dev/null'],
      after_success: 'npm run coverage:report',
      env: {global: colorEnablingEnvironmentVariables}
    }
  )));

  test('coverage is not reported for a project that isnt unit tested', () => scaffold({
    projectType: 'JavaScript',
    projectRoot,
    vcs,
    visibility: 'Public',
    tests: {unit: false}
  }).then(() => assert.calledWith(
    yamlWriter.default,
    `${projectRoot}/.travis.yml`,
    {
      language: 'node_js',
      notifications: {email: false},
      before_script: ['npm ls >/dev/null'],
      env: {global: colorEnablingEnvironmentVariables}
    }
  )));

  suite('private project', () => {
    test('that a badge is not defined and coverage is not reported for a private project', async () => {
      assert.deepEqual(await scaffold({projectType: 'JavaScript', projectRoot, vcs, visibility: 'Private'}), {});

      assert.calledWith(
        yamlWriter.default,
        `${projectRoot}/.travis.yml`,
        {
          language: 'node_js',
          notifications: {email: false},
          before_install: privateNpmTokenInjectionScript,
          before_script: privateBeforeScriptScripts,
          after_script: 'npm run greenkeeper:upload-lockfile',
          env: {global: colorEnablingEnvironmentVariables}
        }
      );
    });
  });

  suite('package', () => {
    const regexToExcludePublishedVersionTagsFromBuilding
      = '/^v\\d+\\.\\d+\\.\\d+(-(alpha|beta)\\.\\d+(@(alpha|beta))?)?$/';
    const configToPublishWithSemanticRelease = {
      provider: 'script',
      skip_cleanup: true,
      script: 'npx semantic-release',
      on: {all_branches: true}
    };

    test('that packages get deployed with semantic-release, but tag builds are excluded', () => assert.becomes(
      scaffold({projectType: 'JavaScript', projectRoot, vcs, visibility: 'Private', packageType: 'Package'}),
      {}
    ).then(() => assert.calledWith(
      yamlWriter.default,
      `${projectRoot}/.travis.yml`,
      {
        language: 'node_js',
        notifications: {email: false},
        branches: {except: [regexToExcludePublishedVersionTagsFromBuilding]},
        before_install: privateNpmTokenInjectionScript,
        before_script: privateBeforeScriptScripts,
        after_script: 'npm run greenkeeper:upload-lockfile',
        deploy: configToPublishWithSemanticRelease,
        env: {global: colorEnablingEnvironmentVariables}
      }
    )));
  });

  suite('lockfile', () => {
    test(
      'that the installation command is directly controlled after node 10.5 since npm 6 is bundled, ' +
      'which defaults to the `npm ci` command',
      async () => {
        await scaffold({projectType: 'JavaScript', projectRoot, vcs, visibility: 'Private', nodeVersion: '10.3'});

        assert.calledWith(
          yamlWriter.default,
          `${projectRoot}/.travis.yml`,
          sinon.match({
            install: 'case $TRAVIS_BRANCH in greenkeeper*) npm i;; *) npm ci;; esac;'
          })
        );
      }
    );

    test(
      'that the installation command is directly controlled after node 8.12 since npm 6 is bundled, ' +
      'which defaults to the `npm ci` command',
      async () => {
        await scaffold({projectType: 'JavaScript', projectRoot, vcs, visibility: 'Private', nodeVersion: '8.12'});

        assert.calledWith(
          yamlWriter.default,
          `${projectRoot}/.travis.yml`,
          sinon.match({
            install: 'case $TRAVIS_BRANCH in greenkeeper*) npm i;; *) npm ci;; esac;'
          })
        );
      }
    );

    test('that the installation command is not directly controlled for node 9 since npm 6 is not bundled', async () => {
      await scaffold({projectType: 'JavaScript', projectRoot, vcs, visibility: 'Private', nodeVersion: '9'});

      assert.neverCalledWithMatch(
        yamlWriter.default,
        `${projectRoot}/.travis.yml`,
        {install: 'case $TRAVIS_BRANCH in greenkeeper*) npm i;; *) npm ci;; esac;'}
      );
    });

    test(
      'that the installation command is not directly controlled for node below 8.12 since npm 6 is not bundled',
      async () => {
        await scaffold({projectType: 'JavaScript', projectRoot, vcs, visibility: 'Private', nodeVersion: '8.11'});

        assert.neverCalledWithMatch(
          yamlWriter.default,
          `${projectRoot}/.travis.yml`,
          {install: 'case $TRAVIS_BRANCH in greenkeeper*) npm i;; *) npm ci;; esac;'}
        );
      }
    );

    test('that the installation command is not directly controlled for public projects', async () => {
      await scaffold({
        projectType: 'JavaScript',
        projectRoot,
        vcs,
        visibility: 'Public',
        nodeVersion: '10.3',
        tests: {}
      });

      assert.neverCalledWithMatch(
        yamlWriter.default,
        `${projectRoot}/.travis.yml`,
        {install: 'case $TRAVIS_BRANCH in greenkeeper*) npm i;; *) npm ci;; esac;'}
      );
    });
  });
});
