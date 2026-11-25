public with sharing class AccountService {

    public static void updateAccountRatings(Set<Id> accountIds) {
        List<Account> accounts = [
            SELECT Id, AnnualRevenue, Rating
            FROM Account
            WHERE Id IN :accountIds
        ];

        for (Account acc : accounts) {
            if (acc.AnnualRevenue != null && acc.AnnualRevenue >= 10000000) {
                acc.Rating = 'Hot';
            } else {
                acc.Rating = 'Warm';
            }
        }

        update accounts;
    }

    @AuraEnabled(cacheable=true)
    public static List<Account> getTopAccounts(Integer limitCount) {
        return [
            SELECT Id, Name, AnnualRevenue
            FROM Account
            ORDER BY AnnualRevenue DESC NULLS LAST
            LIMIT :limitCount
        ];
    }
}
