import { AegisPolicy, DEFAULT_AEGIS_POLICY, decryptAESGCM, IBytecodeChunk } from '@aegis/core';
import { AegisVM } from './vm.js';
import { Sentinel } from './sentinel.js';
import { AdaptiveResponder } from './responder.js';

export class AegisLoader {
  private policy: AegisPolicy;
  private responder: AdaptiveResponder;
  private sentinel: Sentinel;

  constructor(policy: Partial<AegisPolicy> = {}) {
    this.policy = { ...DEFAULT_AEGIS_POLICY, ...policy };
    this.responder = new AdaptiveResponder(this.policy);
    this.sentinel = new Sentinel(this.responder);
  }

  public startSentinel(): void {
    this.sentinel.startMonitoring();
  }

  public stopSentinel(): void {
    this.sentinel.stopMonitoring();
  }

  public async loadAndExecute(bundleUrlOrData: string | object, secretSeed: string): Promise<any> {
    let bundle: any = bundleUrlOrData;

    if (typeof bundleUrlOrData === 'string') {
      if (bundleUrlOrData.startsWith('http') || bundleUrlOrData.endsWith('.aegis')) {
        const response = await fetch(bundleUrlOrData);
        bundle = await response.json();
      } else {
        bundle = JSON.parse(bundleUrlOrData);
      }
    }

    let chunk: IBytecodeChunk;
    if (bundle.encryptedData && bundle.iv) {
      const decryptedStr = await decryptAESGCM(bundle.encryptedData, bundle.iv, secretSeed);
      chunk = JSON.parse(decryptedStr);
    } else {
      chunk = bundle as IBytecodeChunk;
    }

    const vm = new AegisVM(this.responder);
    return vm.execute(chunk);
  }
}
