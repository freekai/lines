/*global module, require */
module.exports = function (grunt) {
    "use strict";
    
    var fs = require("fs-extra");
    
    grunt.initConfig({
        pkg: grunt.file.readJSON("package.json"),
        dst: "dist",
        requirejs: {
            build: {
                options: {
                    baseUrl: "www/js",
                    out: "<%= dst %>/js/game.js",
                    useSourceUrl: false,
                    preserveLicenseComments: false,
                    removeCombined: false,
                    optimize: "uglify2",
                    uglify2: {
                        output: {
                            preamble: "/*\n * Copyright (c) 2015 Arzhan \"kai\" Kinzhalin. All rights reserved.\n * Licensed under MIT license\n */"
                        },
                        mangle: true
                    },
                    optimizeCss: "standard",
                    include: [
                        "game"
                    ]
                }
            }
        },
        copy: {
            build: {
                files: [
                    {
                        expand: true,
                        cwd: "www/",
                        dest: "<%= dst %>",
                        src: [
                            "index.html",
                            "js/3rd/require.js",
                            "main.css"
                        ]
                    }
                ]
            }
        },
        "ftp-deploy": {
            build: {
                auth: {
                    host: "mkhs.com",
                    port: 21,
                    authKey: "secret"
                },
                src: "dist",
                dest: "public_html/lines",
                exclusions: ["build.txt"]
            }
        }
    });
    
    grunt.registerTask("clean-dist", function () {
        var done = this.async();
        
        grunt.config.requires("dst");
        
        fs.remove(grunt.config("dst"), function (err) {
            if (err) {
                done(false);
            } else {
                done();
            }
        });
    });
    
    grunt.registerTask("make-dist", function () {
        var done = this.async();

        grunt.config.requires("dst");
        
        fs.mkdirs(grunt.config("dst"), function (err) {
            if (err) {
                done(false);
            } else {
                done();
            }
        });
    });
    
    grunt.loadNpmTasks("grunt-contrib-copy");
    grunt.loadNpmTasks("grunt-contrib-requirejs");
    grunt.loadNpmTasks("grunt-ftp-deploy");
    
    grunt.registerTask("default", ["clean-dist", "make-dist", "copy", "requirejs"]);
    grunt.registerTask("publish", ["default", "ftp-deploy"]);
    grunt.registerTask("clean", ["clean-dist"]);
    
};
