import { BambooBasicAuthPayload } from '@easybread/adapter-bamboo-hr';
import { GoogleContactsOauth2StartOperation } from '@easybread/adapter-google-contacts';
import {
  GoogleCommonOauth2CompleteOperation,
  GoogleCommonOperationName
} from '@easybread/google-common';
import {
  BreadOperationName,
  SetupBasicAuthOperation
} from '@easybread/operations';

import { ADAPTER_NAME } from '../../common';
import { bambooHrClient, googleClient, stateAdapter } from '../shared';
import {
  AdaptersStateDto,
  AdapterStateDto,
  CompleteGoogleOauth2Dto,
  SetupBambooDto
} from './dtos';

export class AdaptersService {
  static async adaptersState(breadId: string): Promise<AdaptersStateDto> {
    const google = await stateAdapter.read<AdapterStateDto>(
      this.createAdapterStateKey(breadId, ADAPTER_NAME.GOOGLE)
    );

    const bamboo = await stateAdapter.read<AdapterStateDto>(
      this.createAdapterStateKey(breadId, ADAPTER_NAME.BAMBOO)
    );

    return { google, bamboo };
  }

  static async resetConfiguration(
    breadId: string,
    adapter: ADAPTER_NAME
  ): Promise<AdapterStateDto> {
    return await stateAdapter.write<AdapterStateDto>(
      this.createAdapterStateKey(breadId, adapter),
      { configured: false }
    );
  }

  static async setConfigured(
    breadId: string,
    adapter: ADAPTER_NAME
  ): Promise<AdapterStateDto> {
    return await stateAdapter.write<AdapterStateDto>(
      this.createAdapterStateKey(breadId, adapter),
      { configured: true }
    );
  }

  static async createBambooConfiguration(
    breadId: string,
    dto: SetupBambooDto
  ): Promise<SetupBasicAuthOperation<BambooBasicAuthPayload>['output']> {
    const { apiKey, companyName } = dto;
    const result = await bambooHrClient.invoke<
      SetupBasicAuthOperation<BambooBasicAuthPayload>
    >({
      name: BreadOperationName.SETUP_BASIC_AUTH,
      breadId,
      payload: { apiKey, companyName }
    });

    if (result.rawPayload.success) {
      await this.setConfigured(breadId, ADAPTER_NAME.BAMBOO);
    }

    return result;
  }

  static async startGoogleOAuthFlow(
    breadId: string
  ): Promise<GoogleContactsOauth2StartOperation['output']> {
    return googleClient.invoke<GoogleContactsOauth2StartOperation>({
      name: GoogleCommonOperationName.AUTH_FLOW_START,
      breadId,
      payload: {
        prompt: ['consent'],
        includeGrantedScopes: true,
        scope: [
          'https://www.google.com/m8/feeds/',
          'https://www.googleapis.com/auth/contacts.readonly'
        ]
      }
    });
  }

  static async completeGoogleOAuthFlow(
    breadId: string,
    dto: CompleteGoogleOauth2Dto
  ): Promise<GoogleCommonOauth2CompleteOperation['output']> {
    const { code } = dto;

    const output = await googleClient.invoke<
      GoogleCommonOauth2CompleteOperation
    >({
      name: GoogleCommonOperationName.AUTH_FLOW_COMPLETE,
      breadId,
      payload: { code }
    });

    if (output.rawPayload.success) {
      await this.setConfigured(breadId, ADAPTER_NAME.GOOGLE);
    }

    return output;
  }

  private static createAdapterStateKey(
    breadId: string,
    adapter: ADAPTER_NAME
  ): string {
    return `${breadId}:adapters:state:${adapter}`;
  }
}
