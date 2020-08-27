import { CookieJar } from 'request';
import * as rp from 'request-promise';
import Constants from './constants';
import { MideaDeviceType } from './MideaDeviceType';
import Utils from './utils';
import * as crypto from 'crypto';

const BaseHeader = { 'User-Agent': Constants.UserAgent };

export class Platform {
  private _token: string;
  private _sessionId: string;
  private _dataKey: string;
  private _jar: CookieJar = rp.jar();

  async login(): Promise<void> {
    const loginIdUrl = 'https://mapp.appsmb.com/v1/user/login/id/get';

    const loginIdForm: any = {
      loginAccount: 'azargoth@gmail.com',
      clientType: Constants.ClientType,
      src: Constants.RequestSource,
      appId: Constants.AppId,
      format: Constants.RequestFormat,
      stamp: Utils.getStamp(),
      language: Constants.Language
    };

    const loginIdSign = this._getSign(loginIdUrl, loginIdForm);
    loginIdForm.sign = loginIdSign;

    const loginIdResponse = await rp.post({
      url: loginIdUrl,
      headers: BaseHeader,
      followAllRedirects: true,
      json: true,
      form: loginIdForm,
      jar: this._jar,
      gzip: true
    });

    console.log(loginIdResponse);

    if (loginIdResponse.errorCode !== '0') {
      throw new Error('LoginId call unsuccessful');
    }

    const { loginId } = loginIdResponse.result;

    const password: string = this.getSignPassword(loginId);

    const tokenUrl = 'https://mapp.appsmb.com/v1/user/login';

    const tokenForm: any = {
      loginAccount: 'azargoth@gmail.com',
      src: Constants.RequestSource,
      format: Constants.RequestFormat,
      stamp: Utils.getStamp(),
      language: Constants.Language,
      password: password,
      clientType: Constants.ClientType,
      appId: Constants.AppId
    };

    const sign = this._getSign(tokenUrl, tokenForm);
    tokenForm.sign = sign;

    const tokenResponse = await rp.post({
      url: tokenUrl,
      headers: BaseHeader,
      followAllRedirects: true,
      json: true,
      form: tokenForm,
      jar: this._jar,
      gzip: true
    });

    console.log(tokenResponse);

    if (tokenResponse.errorCode !== '0') {
      throw new Error('Token call unsuccessful');
    }

    const { accessToken, sessionId } = tokenResponse.result;
    this._token = accessToken;
    this._sessionId = sessionId;
    this._dataKey = this._generateDataKey(accessToken);
  }

  private _getSign(path: string, form: any): string {
    let postfix = '/' + path.split('/').slice(3).join('/');
    // Maybe this will help, should remove any query string parameters in the URL from the sign
    postfix = postfix.split('?')[0]
    const ordered: any = {};
    Object.keys(form)
      .sort()
      .forEach(function (key: any) {
        ordered[key] = form[key];
      });
    const query = Object.keys(ordered)
      .map((key) => key + '=' + ordered[key])
      .join('&');

    return crypto
      .createHash('sha256')
      .update(postfix + query + Constants.AppKey)
      .digest('hex');
  }

  async getUserList(): Promise<any> {
    const form: any = {
      src: Constants.RequestSource,
      format: Constants.RequestFormat,
      stamp: Utils.getStamp(),
      language: Constants.Language,
      sessionId: this._sessionId
    };
    const url = 'https://mapp.appsmb.com/v1/appliance/user/list/get';
    const sign = this._getSign(url, form);
    form.sign = sign;
    const response = await rp.post({
      url: url,
      headers: BaseHeader,
      followAllRedirects: true,
      json: true,
      form: form,
      jar: this._jar,
      gzip: true
    });
    console.log(JSON.stringify(response));
    if (response.errorCode !== '0') {
      throw new Error('Error getting list');
    }
    const { list } = response.result;
    // if (list.length > 0) {
    //   list.forEach((currentElement: any) => {
    //     if (parseInt(currentElement.type) == MideaDeviceType.AirConditioner || parseInt(currentElement.type) == MideaDeviceType.Dehumidifier) {
    //       const uuid = this.api.hap.uuid.generate(currentElement.id)
    //
    //       const existingAccessory = this.accessories.find(accessory => accessory.UUID === uuid)
    //
    //       if (existingAccessory) {
    //         this.log.debug('Restoring cached accessory', existingAccessory.displayName)
    //         existingAccessory.context.deviceId = currentElement.id
    //         existingAccessory.context.deviceType = parseInt(currentElement.type)
    //         existingAccessory.context.name = currentElement.name
    //         this.api.updatePlatformAccessories([existingAccessory])
    //
    //         var ma = new MideaAccessory(this, existingAccessory, currentElement.id, parseInt(currentElement.type), currentElement.name, currentElement.userId)
    //         this.mideaAccessories.push(ma)
    //       } else {
    //         this.log.debug('Adding new device:', currentElement.name)
    //         const accessory = new this.api.platformAccessory(currentElement.name, uuid)
    //         accessory.context.deviceId = currentElement.id
    //         accessory.context.name = currentElement.name
    //         accessory.context.deviceType = parseInt(currentElement.type)
    //
    //         var ma = new MideaAccessory(this, accessory, currentElement.id, parseInt(currentElement.type), currentElement.name, currentElement.userId)
    //         this.api.registerPlatformAccessories('homebridge-midea', 'midea', [accessory])
    //
    //         this.mideaAccessories.push(ma)
    //       }
    //       // this.log.debug('mideaAccessories now contains', this.mideaAccessories)
    //     } else {
    //       this.log.warn('Device ' + currentElement.name + ' is of unsupported type ' + MideaDeviceType[parseInt(currentElement.type)])
    //       this.log.warn('Please open an issue on GitHub with your specific device model')
    //     }
    //
    //   });
    // }
  }

  getSignPassword(loginId: string): string {
    const pw = crypto.createHash('sha256').update('1mm0rtal').digest('hex');

    return crypto
      .createHash('sha256')
      .update(loginId + pw + Constants.AppKey)
      .digest('hex');
  }

  private _generateDataKey(token: string): string {
    const md5AppKey = crypto.createHash('md5').update(Constants.AppKey).digest('hex');
    const decipher = crypto.createDecipheriv('aes-128-ecb', md5AppKey.slice(0, 16), '');
    const dec = decipher.update(token, 'hex', 'utf8');
    return dec;
  }
}
