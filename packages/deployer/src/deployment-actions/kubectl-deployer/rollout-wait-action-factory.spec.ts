import { expect } from "chai"
import { RolloutWaitActionFactory } from "./rollout-wait-action-factory"

import { createFakeExec } from "../../test-tools/fake-exec"
import { createFakeStateStore, TFakeStateStore } from "../../deployment-orchestration/fake-state-store-factory"
import { CreateFakeLogger, IFakeLogging } from "../../test-tools/fake-logger"
import { IExecutableAction, TActionExecutionOptions } from "../../deployment-types"
import { TFakeExec } from "../../test-tools/fake-exec"


describe("K8S deployment rollout status wait action factory", function() {

  let fakeStateStore: TFakeStateStore
  let fakeExec: TFakeExec
  let fakeLogger: IFakeLogging
  let rolloutAction: IExecutableAction

  before(()=>{
    fakeStateStore = createFakeStateStore()
    fakeLogger = CreateFakeLogger()

    fakeExec = createFakeExec()

    rolloutAction = RolloutWaitActionFactory("Deployment/my-awesome-deployment")
  })

  it("should remember descriptor", function() {
    expect(rolloutAction.descriptor).to.equal("Deployment/my-awesome-deployment")
  })

  it("should remember descriptor", function() {
    expect(rolloutAction.planString && rolloutAction.planString()).to.equal("kubectl rollout status Deployment/my-awesome-deployment")
  })


  describe("executing rollout action with waitForRollout true", function() {

    let execResult: IExecutableAction

    before(async ()=>{
      fakeLogger.logStatements = []
      fakeExec.executedCommands = []
      let deploymentOptions: TActionExecutionOptions = {
        pushToUi: false,
        waitForRollout: true,
        dryRun: false,
        dryRunOutputDir: undefined
      }
      return execResult = await rolloutAction.execute(deploymentOptions, fakeExec, fakeLogger, fakeStateStore.saveDeploymentState )
    })

    it("should execute if action execution options state that we want to wait for rollout", () => {
      expect(JSON.stringify(execResult.descriptor)).to.contain('Deployment/my-awesome-deployment')
    })

    it("should execute kubectl rollout wait", () => {
      expect(fakeExec.executedCommands.map((ec)=>ec.command + ' ' + ec.params.join(' ')).join('')).to.contain('kubectl rollout status Deployment/my-awesome-deployment')
    })
  })

  describe("executing rollout action with waitForRollout false", function() {

    before(async ()=>{
      fakeLogger.logStatements = []
      fakeExec.executedCommands = []
      let deploymentOptions: TActionExecutionOptions = {
        pushToUi: false,
        waitForRollout: false,
        dryRun: false,
        dryRunOutputDir: undefined
      }
      await rolloutAction.execute(deploymentOptions, fakeExec, fakeLogger, fakeStateStore.saveDeploymentState )
    })

    it("should not execute kubectl rollout wait", () => {
      expect(fakeExec.executedCommands.map((ec)=>ec.command + ' ' + ec.params.join(' ')).join('')).not.to.contain('rollout status')
    })

  })

})
