const fs = require('fs');
const path = require('path');
const exec = require('child_process').exec;

module.exports = function(hxmlContent) {
    if (this.cacheable) {
        this.cacheable();
    }
    const cb = this.async();

    let jsOutputFile = null;
    let args = [];

    // Add args that are specific to hxml-loader
    if (this.debug) {
        args.push('-debug');
    }
    // We use a special macro to output a file containing all `*.hx` source files used in the haxe build.
    // We can then use this to register them as webpack dependencies so they will be watched for changes.
    args.push('-cp');
    args.push(`"${__dirname}/haxelib/"`);

    // Process all of the args in the hxml file.
    for (let line of hxmlContent.split('\n')) {
        line = line.trim();
        if (line === '' || line.substr(0, 1) === '#') {
            continue;
        }

        let space = line.indexOf(' ');

        let name = space > -1 ? line.substr(0, space) : line;
        args.push(name);

        if (name === '--next') {
            var err = `${this
                .resourcePath} included a "--next" line, hxml-loader only supports a single build per hxml file.`;
            return cb(err);
        }

        if (space > -1) {
            let value = line.substr(space + 1).trim();
            args.push(value);

            if (name === '-js') {
                jsOutputFile = value;
            } else if (name === '-cp') {
                var classPath = path.resolve(value);
                this.addContextDependency(classPath);
            }
        }
    }

    // Execute the Haxe build.
    exec(`haxe ${args.join(' ')}`, (err, stdout, stderr) => {
        if (stdout) {
            console.log(stdout);
        }
        if (stderr) {
            console.error(stderr);
        }
        if (err) {
            return cb(err);
        }

        if (!jsOutputFile) {
            // If the hxml file outputs something other than JS, we should not include it in the bundle.
            // We're only passing it through webpack so that we get `watch` and the like to work.
            return cb(null, "");
        }

        // Read the resulting JS file.
        fs.readFile(jsOutputFile, (err, data) => {
            if (err) return cb(err);

            return cb(null, data);
        });
    });
};
