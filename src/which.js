var common = require('./common');
var fs = require('fs');
var path = require('path');

common.register('which', _which, {
  allowGlobbing: false,
});

// XP's system default value for PATHEXT system variable, just in case it's not
// set on Windows.
var XP_DEFAULT_PATHEXT = '.com;.exe;.bat;.cmd;.vbs;.vbe;.js;.jse;.wsf;.wsh';

// Cross-platform method for splitting environment PATH variables
function splitPath(p) {
  if (!p) return [];
  return p.split(path.delimiter);
}

function checkPath(pathName) {
  return fs.existsSync(pathName) && !fs.statSync(pathName).isDirectory();
}

//@
//@ ### which(command)
//@
//@ Examples:
//@
//@ ```javascript
//@ var nodeExec = which('node');
//@ ```
//@
//@ Searches for `command` in the system's PATH. On Windows, this uses the
//@ `PATHEXT` variable to append the extension if it's not already executable.
//@ Returns string containing the absolute path to the command.
function _which(options, cmd) {
  if (!cmd) common.error('must specify command');

  var pathEnv = process.env.path || process.env.Path || process.env.PATH;
  var pathArray = splitPath(pathEnv);
  var where = null;

  // No relative/absolute paths provided?
  if (cmd.indexOf('/') === -1) {
    // Assume that there are no extensions to append to queries (this is the
    // case for unix)
    var pathExtArray = [''];
    if (common.platform === 'win') {
      // In case the PATHEXT variable is somehow not set (e.g.
      // child_process.spawn with an empty environment), use the XP default.
      var pathExtEnv = process.env.PATHEXT || XP_DEFAULT_PATHEXT;
      pathExtArray = splitPath(pathExtEnv.toUpperCase());
    }

    // Search for command in PATH
    pathArray.forEach(function (dir) {
      if (where) return; // already found it

      var attempt = path.resolve(dir, cmd);

      if (common.platform === 'win') {
        attempt = attempt.toUpperCase();
      }

      // Cycle through the PATHEXT variable
      pathExtArray.forEach(function (ext) {
        // If the argument passed in already has an extension in PATHEXT, just
        // return that
        // TODO(nate): replace with .endsWith(ext) once we use v4+
        if (ext && attempt.slice(-ext.length) === ext && checkPath(attempt)) {
          where = attempt;
          return;
        }

        // Otherwise, see if it exists without the extension
        var newAttempt = attempt + ext;
        if (checkPath(newAttempt)) {
          where = newAttempt;
          return;
        }
      });
    });
  }

  // No relative path was specified, so we return what we found from the search
  if (where) return where;

  // Otherwise, return the absolute path of the path specified
  if (checkPath(cmd)) return path.resolve(cmd);

  // Command not found anywhere?
  return null;
}
module.exports = _which;
