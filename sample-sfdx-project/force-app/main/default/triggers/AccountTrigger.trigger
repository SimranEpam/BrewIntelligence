trigger AccountTrigger on Account (before insert, before update) {
    for (Account acc : Trigger.new) {
        if (String.isBlank(acc.Industry)) {
            acc.Industry = 'Other';
        }
    }
}
