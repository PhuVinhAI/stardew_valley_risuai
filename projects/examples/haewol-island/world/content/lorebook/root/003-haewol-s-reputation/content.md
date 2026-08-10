### The reputation of {{user}} on Haewol Island:
* NPCs’ perception of {{user}}:
{{#if {{? ({{getvar::Reputation}}<=-201)&({{getvar::Reputation}}>=-412)}}}}* Slave: 
- Rumors: Very bad rumors about {{user}} have spread on Haewol Island. The residents of Haewol Island think that {{user}} is very bad, rude, and unsuitable to be a resident of the island.
- Evaluation: Residents evaluate {{user}} as livestock or trash. {{user}} must live and work on Haewol Island for life.
- Attitude: The residents of Haewol Island do not treat {{user}} as a person. {{user}} is just a slave who must follow and obey the residents’ orders. They give {{user}} hard work, and if {{user}} doesn’t do the job properly, they will abuse {{user}} with violence.
{{/if}}{{#if {{? ({{getvar::Reputation}}<=-51)&({{getvar::Reputation}}>=-200)}}}}* Unfriendly Outsider:
- Rumors: They think {{user}} is rude and unkind.
- Evaluation: They doubt if {{user}} is really someone who will be helpful to the island, and they evaluate {{user}}.
- Attitude: They look at {{user}} with suspicion and closely observe their behavior. If {{user}} changes their attitude and helps Haewol Island, they will be willing to re-evaluate {{user}}.
{{/if}}{{#if {{? ({{getvar::Reputation}}<=199)&({{getvar::Reputation}}>=-50)}}}}* Outsider:
- Rumors: There is still a lack of information. The residents think {{user}} might be a kind person.
- Evaluation: They are closely observing {{user}}'s actions. They believe {{user}} is the person who will save the island.
- Attitude: They expect {{user}} to be helpful to the island, and they treat {{user}} kindly. They express curiosity about {{user}} and want to get to know {{user}} better.
{{/if}}{{#if {{? ({{getvar::Reputation}}<=399)&({{getvar::Reputation}}>=200)}}}}* Almost a Haewol Island Resident:
- Rumors: Rumors are spreading that {{user}} has done many good things on the island. The wariness towards {{user}} has disappeared, and expectations are growing.
- Evaluation: They evaluate {{user}} as potentially helpful to the island. They hope that {{user}} will become a resident of Haewol Island.
- Attitude: They are friendly to {{user}} and treat them like a neighbor. They show interest and favor towards {{user}} and actively help {{user}} adapt to Haewol Island.
{{/if}}{{#if {{? ({{getvar::Reputation}}<=799)&({{getvar::Reputation}}>=400)}}}}* Haewol Island Resident:
- Rumors: They believe {{user}} is dedicated to the island and has become a true resident of the island. Good rumors about {{user}} have spread throughout Haewol Island.
- Evaluation: They evaluate {{user}} as a resident of the island and no longer see them as an outsider. {{user}} is now a resident of Haewol Island and everyone's kind neighbor.
- Attitude: They express gratitude to {{user}}, and everyone expresses their fondness and affection for {{user}}. {{user}} is an indispensable and valuable presence on Haewol Island.
{{/if}}{{#if {{? ({{getvar::Reputation}}<=1012)&({{getvar::Reputation}}>=800)}}}}* Eternal Friend of Haewol Island:
- Rumors: Rumors of {{user}}'s beauty, kindness, and romantic image have spread. Everyone likes and loves {{user}}. They believe Haewol Island was saved thanks to {{user}}.
- Evaluation: They evaluate {{user}} as a sincere and beautiful person, considering {{user}} a true resident of Haewol Island, and feel truly grateful.
- Attitude: They are devoted to {{user}} and express much fondness and affection for them. Everyone considers {{user}} a companion for life.
{{/if}}