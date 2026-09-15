use super::Repository;
use rusqlite::{Connection, Result};

impl Repository {
    pub fn export_life_markdown(conn: &Connection, life_id: &str) -> Result<String> {
        let overview = match Self::get_world_overview(conn, life_id)? {
            Some(o) => o,
            None => return Ok(String::from("# 未找到人生世界")),
        };

        let mut md = String::new();
        md.push_str(&format!("# 人生战略档案：{}\n\n", overview.life.name));
        md.push_str(&format!(
            "- 导出时间：{}\n",
            chrono::Utc::now().to_rfc3339()
        ));
        md.push_str(&format!(
            "- 当前战略稳定度：{:?}\n\n",
            overview.stability.current_value
        ));

        if let Some(leader) = &overview.leader {
            md.push_str(&format!(
                "## 最高统帅：{}\n\n{}\n\n",
                leader.name, leader.body_md
            ));
        }

        if let Some(situation) = &overview.situation {
            md.push_str(&format!("## 当前战略局势\n\n{}\n\n", situation.body_md));
        }

        if let Some(philosophy) = &overview.philosophy {
            md.push_str(&format!("## 根本人生哲学\n\n{}\n\n", philosophy.body_md));
        }

        md.push_str("## 特质谱系\n\n");
        for t in &overview.traits {
            md.push_str(&format!("- **{}**：{}\n", t.title, t.body_md));
        }
        md.push('\n');

        md.push_str("## 意识形态\n\n");
        for i in &overview.ideologies {
            md.push_str(&format!("- **{}**：{}\n", i.title, i.body_md));
        }
        md.push('\n');

        md.push_str("## 国家精神\n\n");
        for s in &overview.national_spirits {
            md.push_str(&format!("- **{}**：{}\n", s.title, s.body_md));
        }
        md.push('\n');

        md.push_str("## 正在进行的重点国策\n\n");
        for f in &overview.active_foci {
            md.push_str(&format!("### 国策：{}\n\n{}\n\n", f.title, f.body_md));
        }

        Ok(md)
    }

    pub fn export_life_json(conn: &Connection, life_id: &str) -> Result<String> {
        let overview = Self::get_world_overview(conn, life_id)?;
        let all_foci = Self::get_foci(conn, life_id)?;
        let focus_relations = Self::get_focus_relations(conn, life_id)?;
        let all_traits = Self::get_traits(conn, life_id, true)?;
        let trait_relations = Self::get_trait_relations(conn, life_id)?;
        let essays = Self::get_essays(conn, life_id)?;
        let events = Self::get_events(conn, life_id)?;
        let sub_foci = Self::list_all_sub_foci(conn, life_id)?;
        let staff_members = Self::get_staff_members(conn, life_id)?;
        let staff_meetings = Self::get_staff_meetings(conn, life_id)?;
        let stability_history = Self::get_stability_history(conn, life_id, 1000)?;

        let data = serde_json::json!({
            "version": 2,
            "exported_at": chrono::Utc::now().to_rfc3339(),
            "life_id": life_id,
            "world_overview": overview,
            "all_foci": all_foci,
            "focus_relations": focus_relations,
            "all_traits": all_traits,
            "trait_relations": trait_relations,
            "essays": essays,
            "events": events,
            "sub_foci": sub_foci,
            "staff_members": staff_members,
            "staff_meetings": staff_meetings,
            "stability_history": stability_history,
        });

        Ok(serde_json::to_string_pretty(&data).unwrap_or_default())
    }
}
