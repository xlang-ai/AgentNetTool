import type { ForgeConfig } from '@electron-forge/shared-types';
import { MakerSquirrel } from '@electron-forge/maker-squirrel';
import { MakerZIP } from '@electron-forge/maker-zip';
import { MakerDeb } from '@electron-forge/maker-deb';
import { MakerRpm } from '@electron-forge/maker-rpm';
import { AutoUnpackNativesPlugin } from '@electron-forge/plugin-auto-unpack-natives';
import { WebpackPlugin } from '@electron-forge/plugin-webpack';
import { FusesPlugin } from '@electron-forge/plugin-fuses';
import { FuseV1Options, FuseVersion } from '@electron/fuses';

import { mainConfig } from './webpack.main.config';
import { rendererConfig } from './webpack.renderer.config';

const _osxSign = process.platform === 'darwin' ? {} : undefined;
const _osxNotarize = process.platform === 'darwin' ? {
  appleId: process.env.APPLE_ID,
  appleIdPassword: process.env.APPLE_PASSWORD,
  teamId: process.env.APPLE_TEAM_ID
} : undefined;

const config: ForgeConfig = {
  packagerConfig: {
    asar: true,
    name: 'agentnet-annotator',
    icon: './src/assets/icon',
    extraResource: [
      'api/dist/backend/'
    ],
    osxSign: _osxSign,
    osxNotarize: _osxNotarize,
    protocols: [
      {
        name: 'agentnet',
        schemes: ['agentnet'],
      },
    ]
  },
  rebuildConfig: {},
  makers: [
    new MakerSquirrel({}), new MakerZIP({}, ['darwin']), new MakerRpm({}), new MakerDeb({}),
    {
      name: '@electron-forge/maker-dmg',
      config: {
        format: 'ULFO'
      }
    }
  ],
  plugins: [
    new AutoUnpackNativesPlugin({}),
    new WebpackPlugin({
      mainConfig,
      devContentSecurityPolicy: "connect-src 'self' * 'unsafe-eval'",
      renderer: {
        config: rendererConfig,
        
        entryPoints: [
          {
            html: './src/index.html',
            js: './src/renderer.ts',
            name: 'main_window',
            preload: {
              js: './src/preload.ts',
            },
          },
        ],
      },
    }),
    // Fuses are used to enable/disable various Electron functionality
    // at package time, before code signing the application
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
};

export default config;
