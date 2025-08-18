import Dexie, {Table} from 'dexie';
import type {Transaction} from './transactions'

export class TransactionsDB extends Dexie { 
    transactions!: Table<Transaction, string>;

    constructor() { 
        super('TransactionsDB');
        this.version(1).stores({
            transactions:'id, date, account_id, category_id, vendor, amount, type'
        });
    }
}

export const transactionsDb = new TransactionsDB();