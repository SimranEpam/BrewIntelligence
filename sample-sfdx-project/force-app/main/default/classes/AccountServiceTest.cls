@IsTest
private class AccountServiceTest {

    @IsTest
    static void testUpdateAccountRatings() {
        List<Account> accounts = new List<Account>{
            new Account(Name = 'Big Co', AnnualRevenue = 5000000),
            new Account(Name = 'Small Co', AnnualRevenue = 10000)
        };
        insert accounts;

        Test.startTest();
        AccountService.updateAccountRatings(new Map<Id, Account>(accounts).keySet());
        Test.stopTest();

        Account big = [SELECT Rating FROM Account WHERE Name = 'Big Co'];
        Account small = [SELECT Rating FROM Account WHERE Name = 'Small Co'];
        System.assertEquals('Hot', big.Rating);
        System.assertEquals('Warm', small.Rating);
    }
}
