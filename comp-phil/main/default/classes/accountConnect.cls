public with sharing class accountConnect {
  
  public accountConnect() {

  }

  @AuraEnabled(cacheable=true)
  public static List<contact> getContactList(){
    return [Select id,name,account.Name from contact];
  }

  @AuraEnabled(cacheable=true)
  public static List<account> getRecordID(){
    return [Select account.Name from account];
  }

  @AuraEnabled(cacheable=true)
  public static String pageID(){
    return 'hi';
  }

}
