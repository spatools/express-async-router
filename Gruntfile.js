"use strict";

module.exports = function (grunt) {
    require("time-grunt")(grunt); // Time how long tasks take. Can help when optimizing build times
    
    //#region Initialization
    
    var config = {
        
        pkg: grunt.file.readJSON("package.json"),
        
        options: {
            dev: grunt.option("dev"),
            env: grunt.option("env") || "preprod",
        },
        
        paths: {
            build: "dist",
            temp: "temp"
        },
    };
    
    //#endregion
    
    //#region Typescript
    
    config.ts = {
        options: {
            target: "es5",
            module: "commonjs",
            sourceMap: true,
            declaration: false,
            comments: false,
            disallowbool: true,
            disallowimportmodule: true,
            fast: "never"
        },
        src: {
            src: ["*.ts"]
        },
        decla: {
            src: "<%= ts.src.src %>",
            dest: "<%= paths.temp %>",
            options: {
                rootDir: ".",
                sourceMap: false,
                declaration: true,
                comments: true
            }
        },
        dist: {
            src: "<%= ts.src.src %>",
            dest: "<%= paths.build %>",
            options: {
                rootDir: ".",
                sourceMap: false
            }
        }
    };
    
    //#endregion
    
    //#region Static
    
    config.copy = {
        dist: {
            files: [
                {
                    src: "package.json",
                    dest: "<%= paths.build %>/package.json"
                }
            ]
        }
    };
    
    //#endregion
    
    //#region Tests 
    
    config.jshint = {
        options: {
            jshintrc: "jshint.json",
        },
        
        src: ["*.js"],
        dist: ["<%= paths.build %>/*.js"],
    };
    
    config.tslint = {
        options: {
            configuration: grunt.file.readJSON("tslint.json")
        },
        
        src: ["*.ts"]
    };
    
    //#endregion
    
    //#region Publish
    
    config.buildcontrol = {
        options: {
            dir: "<%= paths.build %>",
            commit: true,
            push: true,
            config: {
                "user.name": "buildcontrol",
                "user.email": "robot@touchify.co"
            }
        },
        release: {
            options: {
                remote: "<%= pkg.repository.url %>",
                branch: "release"
            }
        }
    };
    
    //#endregion
    
    //#region Cleanup
    
    config.clean = {
        temp: "<%= paths.temp %>/",
        dist: "<%= paths.build %>/",
        src: [
            "*.{js,js.map}",
            "!Gruntfile.js"
        ]
    };
    
    //#endregion
    
    //#region Fix Declaration
    
    grunt.registerTask("fix-declaration", function() {
        var EOL = require("os").EOL,
            source = config.paths.temp + "/index.d.ts",
            dest = config.paths.build + "/index.d.ts",
            content = grunt.file.read(source);
            
        content = content.replace(/\/\/\/\s*<reference path="..\/_references.d.ts" \/>\r?\n/, "");
        content = content.replace(/export declare/g, "export");
        content = content.replace(/\r?\n(.)/g, EOL + "\t$1");
        
        content =
            "declare module \"" + config.pkg.name + "\" {" + EOL +
            "\t" + content +
            "}" + EOL;
        
        grunt.file.write(dest, content);
        grunt.log.ok(dest + " fixed and copied!");
    });
    
    //#endregion
    
    //#region Aliases
    
    grunt.initConfig(config);
    
    grunt.loadNpmTasks("grunt-build-control");
    grunt.loadNpmTasks("grunt-contrib-clean");
    grunt.loadNpmTasks("grunt-contrib-copy");
    grunt.loadNpmTasks("grunt-contrib-jshint");
    grunt.loadNpmTasks("grunt-ts");
    grunt.loadNpmTasks("grunt-tslint");
    
    grunt.registerTask("src", ["clean:src", "tslint:src", "ts:src", "jshint:src"]);
    grunt.registerTask("build", ["clean:dist", "tslint:src", "ts:dist", "copy:dist", "jshint:dist"]);
    grunt.registerTask("decla", ["clean:temp", "ts:decla", "fix-declaration"]);
    grunt.registerTask("publish", ["build", "buildcontrol"]);
    
    grunt.registerTask("default", ["build", "decla"]);

    //#endregion
};