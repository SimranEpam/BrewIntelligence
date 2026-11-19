import { LightningElement, api, wire } from 'lwc';
import getTopAccounts from '@salesforce/apex/AccountService.getTopAccounts';

export default class AccountTopList extends LightningElement {
    @api recordLimit = 5;

    accounts = [];
    error;

    @wire(getTopAccounts, { limitCount: '$recordLimit' })
    wiredAccounts({ data, error }) {
        if (data) {
            this.accounts = data;
            this.error = undefined;
        } else if (error) {
            this.error = error;
            this.accounts = [];
        }
    }
}
