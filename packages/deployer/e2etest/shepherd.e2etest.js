const script = require('../src/test-tools/script-test');
const fs = require('fs');
const path = require('path');
const _ = require('lodash');

const PgBackend = require("@shepherdorg/postgres-backend").PostgresStore;
const PgConfig = require('@shepherdorg/postgres-backend').PgConfig;

const cleanDir = require("../src/test-tools/clean-dir");


describe('run all deployers with infrastructure', function () {

    let shepherdTestHarness = __dirname + '/test-shepherd.sh';

    this.timeout(40000)

    beforeEach(function () {
        if (!fs.existsSync("./.testdata")) {
            fs.mkdirSync("./.testdata");
        }
        if (!fs.existsSync("./.testdata/.build")) {
            fs.mkdirSync("./.testdata/.build");
        }
        if (!fs.existsSync("./.testdata/.build/actual")) {
            fs.mkdirSync("./.testdata/.build/actual");
        }
        cleanDir("./.testdata/.build/actual", false);
    });

    describe('default state storage', function () {

        beforeEach(()=>{
            cleanDir(path.join(require('os').homedir(), ".shepherdstore"));
        });

       it('should deploy everything', function (done) {
            script.execute(shepherdTestHarness, [], {
                env: _.extend({}, process.env, {NO_REBUILD_IMAGES: true, SHEPHERD_PG_HOST: ""}),
                debug: false // debug:false suppresses stdout of process
            }).output('./.testdata/.build/kubeapply').shouldEqual('./e2etest/expected/k8s-deployments')
                .done(function (stdout) {
                    done();
                });
        });
    });


    describe('with state storage', function () {

        beforeEach(function () {
            if (!process.env.SHEPHERD_PG_HOST) {
                process.env.SHEPHERD_PG_HOST = "localhost";
            }

            process.env.RESET_FOR_REAL = "yes-i-really-want-to-drop-deployments-table";
            let pgBackend = PgBackend(PgConfig());

            cleanDir("./.testdata/.build/testexport", false);

            return pgBackend.connect().then(() => pgBackend.resetAllDeploymentStates());
        });

        it('should deploy once in two runs', function (done) {

            script.execute(shepherdTestHarness, [], {
                env: _.extend({NO_REBUILD_IMAGES: true,}, process.env),
                debug: false // debug:false suppresses stdout of process
            })
                .output('./.testdata/.build/kubeapply')
                .shouldEqual(process.cwd() + '/e2etest/expected/k8s-deployments').done(function (stdout) {

                process.env.KUBECTL_OUTPUT_FOLDER = './.testdata/.build/kubeapply-secondround';

                script.execute(shepherdTestHarness, [], {
                    env: _.extend({NO_REBUILD_IMAGES: true,}, process.env),
                    debug: false // debug:false suppresses stdout of process
                })
                    .output('./.testdata/.build/kubeapply-secondround')
                    .shouldBeEmptyDir().done(function (stdout) {
                        done();
                    }
                );
            });
        });

        it('should modify feature deployment', function (done) {

            script.execute(shepherdTestHarness, [], {
                env: _.extend({NO_REBUILD_IMAGES: true,}, process.env),
                debug: false // debug:false suppresses stdout of process
            }).done(function (stdout) {

                process.env.KUBECTL_OUTPUT_FOLDER = './.testdata/.build/kubeapply-secondround';
                done();
            });
        });

        it('should export deployment documents directly', function (done) {
            let expectedOutputFileOrDir = process.cwd() + '/e2etest/expected/all-deployments';
            script.execute(shepherdTestHarness, ['--testrun-mode'], {
                env: _.extend({NO_REBUILD_IMAGES: true,}, process.env),
                debug: false // debug:false suppresses stdout of process
            })
                .output('./.testdata/.build/testexport')
                .shouldEqual(expectedOutputFileOrDir).done(function (stdout) {

                process.env.KUBECTL_OUTPUT_FOLDER = './.testdata/.build/kubeapply-secondround';

                done();
            });
        });


    });
});

