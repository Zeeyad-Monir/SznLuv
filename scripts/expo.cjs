const { existsSync } = require('node:fs');
const { dirname, join } = require('node:path');
const { execFileSync, execFile } = require('node:child_process');
const { promisify } = require('node:util');

const run = promisify(execFile);
const expoRoot = dirname(require.resolve('expo/package.json'));
const cliEntry = require.resolve('@expo/cli', { paths: [expoRoot] });

// SDK 52 predates Xcode 27, which replaced Simulator.app with Device Hub.
// Keep this shim in the launcher so installing dependencies doesn't erase it.
function enableDeviceHub() {
  if (process.platform !== 'darwin') return;
  if (require(join(expoRoot, 'package.json')).version.split('.')[0] !== '52') return;

  let developerDir;
  try {
    developerDir = execFileSync('xcode-select', ['-p'], { encoding: 'utf8' }).trim();
  } catch {
    return; // Let Expo report its normal Xcode setup error.
  }

  const candidates = [
    join(developerDir, '../Applications/DeviceHub.app'),
    join(developerDir, 'Applications/DeviceHub.app'),
  ];
  const hub = candidates.find(existsSync);
  if (!hub || existsSync(join(developerDir, 'Applications/Simulator.app'))) return;

  const cliRoot = dirname(require.resolve('@expo/cli/package.json', { paths: [expoRoot] }));
  const { SimulatorAppPrerequisite } = require(join(
    cliRoot, 'build/src/start/doctor/apple/SimulatorAppPrerequisite.js'
  ));
  const { AppleDeviceManager } = require(join(
    cliRoot, 'build/src/start/platforms/ios/AppleDeviceManager.js'
  ));

  // Xcode and simctl prerequisites still run; only the obsolete app check changes.
  SimulatorAppPrerequisite.instance.assertAsync = async () => {
    await run('xcrun', ['simctl', 'help']);
  };
  AppleDeviceManager.prototype.activateWindowAsync = async function () {
    if (this.device.udid) {
      await run('open', ['-a', hub, `devices://device/open?id=${encodeURIComponent(this.device.udid)}`]);
    } else {
      await run('open', ['-a', hub]);
    }
  };
}

enableDeviceHub();
require(cliEntry);
