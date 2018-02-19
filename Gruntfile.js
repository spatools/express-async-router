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
            src: ["typings/index.d.ts", "*.ts"],
            tsconfig: "tsconfig.json"
        },
        dist: {
            src: "<%= ts.src.src %>",
            dest: "<%= paths.build %>",
            tsconfig: "tsconfig.json",
            options: {
                rootDir: ".",
                declaration: true,
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
                    expand: true,
                    src: ["README.md"],
                    dest: "<%= paths.build %>"
                }
            ]
        }
    };

    grunt.registerTask("packagejson", "", function () {
        var pkg = grunt.file.readJSON("package.json");

        delete pkg.scripts;
        delete pkg.devDependencies;
        delete pkg.optionalDependencies;

        grunt.file.write(config.paths.build + "/package.json", JSON.stringify(pkg, null, 2));
    });

    //#endregion

    //#region Tests 

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
            tag: "<%= pkg.version %>",
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
        dist: "<%= paths.build %>/",
        src: [
            "*.{js,js.map}",
            "!Gruntfile.js"
        ]
    };

    //#endregion

    //#region Aliases

    grunt.initConfig(config);

    grunt.loadNpmTasks("grunt-build-control");
    grunt.loadNpmTasks("grunt-contrib-clean");
    grunt.loadNpmTasks("grunt-contrib-copy");
    grunt.loadNpmTasks("grunt-ts");
    grunt.loadNpmTasks("grunt-tslint");

    grunt.registerTask("src", ["clean:src", "tslint:src", "ts:src"]);
    grunt.registerTask("build", ["clean:dist", "tslint:src", "ts:dist", "copy:dist", "packagejson"]);

    grunt.registerTask("default", ["build"]);
    grunt.registerTask("publish", ["build", "buildcontrol"]);

    //#endregion
};