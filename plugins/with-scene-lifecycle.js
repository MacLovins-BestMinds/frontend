// iOS 27 SDK падает при запуске, если приложение не перешло на жизненный цикл UIScene.
// Шаблон Expo SDK 57 этого не делает, а `expo` 57 уже содержит ExpoAppSceneDelegate.
// Плагин повторяет то, что делает шаблон SDK 58. После перехода на SDK 58 его надо удалить.
const fs = require('fs');
const path = require('path');
const {
  IOSConfig,
  withAppDelegate,
  withDangerousMod,
  withInfoPlist,
  withXcodeProject,
} = require('expo/config-plugins');

const SCENE_DELEGATE_FILE = 'SceneDelegate.swift';

const SCENE_DELEGATE_SOURCE = `internal import Expo

@objc(SceneDelegate)
class SceneDelegate: ExpoAppSceneDelegate {
  // Extension point for config plugins.
}
`;

function withSceneManifest(config) {
  return withInfoPlist(config, (config) => {
    config.modResults.UIApplicationSceneManifest = {
      UIApplicationSupportsMultipleScenes: false,
      UISceneConfigurations: {
        UIWindowSceneSessionRoleApplication: [
          {
            UISceneConfigurationName: 'Default Configuration',
            UISceneDelegateClassName: '$(PRODUCT_MODULE_NAME).SceneDelegate',
          },
        ],
      },
    };
    return config;
  });
}

function withSceneAppDelegate(config) {
  return withAppDelegate(config, (config) => {
    if (config.modResults.language !== 'swift') {
      throw new Error('with-scene-lifecycle: поддерживается только AppDelegate.swift');
    }
    let contents = config.modResults.contents;

    // Фабрику по-прежнему создаёт AppDelegate, а SceneDelegate забирает её через этот протокол.
    if (!contents.includes('ExpoReactNativeFactoryProvider')) {
      contents = contents.replace(
        /class AppDelegate: ExpoAppDelegate \{/,
        'class AppDelegate: ExpoAppDelegate, ExpoReactNativeFactoryProvider {'
      );
    }

    // Окно создаёт и запускает в нём React Native SceneDelegate. Иначе RN стартует дважды.
    contents = contents.replace(
      /\n#if os\(iOS\) \|\| os\(tvOS\)\n\s*window = UIWindow\(frame: UIScreen\.main\.bounds\)[\s\S]*?#endif\n/,
      ''
    );

    if (!contents.includes('ExpoReactNativeFactoryProvider') || contents.includes('UIScreen.main.bounds')) {
      throw new Error('with-scene-lifecycle: не удалось пропатчить AppDelegate.swift, шаблон изменился');
    }
    config.modResults.contents = contents;
    return config;
  });
}

function withSceneDelegateFile(config) {
  config = withDangerousMod(config, [
    'ios',
    (config) => {
      const projectName = IOSConfig.XcodeUtils.getProjectName(config.modRequest.projectRoot);
      const target = path.join(config.modRequest.platformProjectRoot, projectName, SCENE_DELEGATE_FILE);
      fs.writeFileSync(target, SCENE_DELEGATE_SOURCE);
      return config;
    },
  ]);

  return withXcodeProject(config, (config) => {
    const projectName = IOSConfig.XcodeUtils.getProjectName(config.modRequest.projectRoot);
    const filepath = `${projectName}/${SCENE_DELEGATE_FILE}`;
    if (!config.modResults.hasFile(filepath)) {
      config.modResults = IOSConfig.XcodeUtils.addBuildSourceFileToGroup({
        filepath,
        groupName: projectName,
        project: config.modResults,
      });
    }
    return config;
  });
}

module.exports = function withSceneLifecycle(config) {
  config = withSceneManifest(config);
  config = withSceneAppDelegate(config);
  config = withSceneDelegateFile(config);
  return config;
};
