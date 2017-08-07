// Add tasks to create tls stuff, docs, clean
module.exports = function(grunt) {

    grunt.loadNpmTasks('grunt-mocha-test');
    grunt.loadNpmTasks('grunt-exec');
    grunt.loadNpmTasks('grunt-jsdoc');

    grunt.initConfig({
        jsdoc : {
            dist : {
                "tags": {
                    "allowUnknownTags": true
                },
                src: ['README.md','lib/**/*.js', 'test/**/*.js'],
                options: {
                    destination: 'doc'
                }
            }
        }
    });

    grunt.registerTask('default', ['mochaTest']);

};