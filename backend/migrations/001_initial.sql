-- RetailMind core schema v1. JSON payloads preserve complete auditable analytical episodes.


CREATE TABLE datasets (
	id VARCHAR(36) NOT NULL, 
	owner VARCHAR(80) NOT NULL, 
	name VARCHAR(200) NOT NULL, 
	created_at VARCHAR(40) NOT NULL, 
	payload JSON NOT NULL, 
	PRIMARY KEY (id)
)

;

CREATE INDEX ix_datasets_owner ON datasets (owner);


CREATE TABLE episodic_memories (
	id VARCHAR(36) NOT NULL, 
	owner VARCHAR(80) NOT NULL, 
	category VARCHAR(40) NOT NULL, 
	created_at VARCHAR(40) NOT NULL, 
	payload JSON NOT NULL, 
	PRIMARY KEY (id)
)

;

CREATE INDEX ix_episodic_memories_owner ON episodic_memories (owner);

CREATE INDEX ix_episodic_memories_category ON episodic_memories (category);


CREATE TABLE system_settings (
	id VARCHAR(120) NOT NULL, 
	owner VARCHAR(80) NOT NULL, 
	payload JSON NOT NULL, 
	PRIMARY KEY (id)
)

;

CREATE INDEX ix_system_settings_owner ON system_settings (owner);


CREATE TABLE tool_executions (
	id VARCHAR(36) NOT NULL, 
	owner VARCHAR(80) NOT NULL, 
	tool VARCHAR(80) NOT NULL, 
	created_at VARCHAR(40) NOT NULL, 
	payload JSON NOT NULL, 
	PRIMARY KEY (id)
)

;

CREATE INDEX ix_tool_executions_tool ON tool_executions (tool);

CREATE INDEX ix_tool_executions_owner ON tool_executions (owner);


CREATE TABLE reflection_records (
	id VARCHAR(36) NOT NULL, 
	episode_id VARCHAR(36) NOT NULL, 
	owner VARCHAR(80) NOT NULL, 
	payload JSON NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(episode_id) REFERENCES episodic_memories (id)
)

;

CREATE INDEX ix_reflection_records_episode_id ON reflection_records (episode_id);

CREATE INDEX ix_reflection_records_owner ON reflection_records (owner);