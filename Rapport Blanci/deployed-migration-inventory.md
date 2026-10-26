# Recorded GoFit migrations

Read-only verification on 21 October 2026, after project status became ACTIVE_HEALTHY. These 60 entries are recorded in the connected project's migration history. Local comparison uses the 101 SQL filenames under database/migrations. Matching names are not a verification of SQL-content equality. Scripts without history entries must not be described as unapplied solely on that basis.

| Version | Recorded name | Local comparison |
|---|---|---|
| 20260414111922 | extend_get_coach_clients_profile_picture_drop_first | No exact local filename |
| 20260414112034 | get_coach_clients_no_user_profiles_display_name | No exact local filename |
| 20260414112912 | get_conversations_enriched_join_user_profiles_client_picture | Exact local filename exists |
| 20260417090031 | add_body_measurement_ondevice_columns | Exact local filename exists |
| 20260424075135 | create_admin_settings | Exact local filename exists |
| 20260424091401 | marketplace_coach_profiles_select_approved | Exact local filename exists |
| 20260424091640 | marketplace_coaches_directory_v1 | No exact local filename |
| 20260427073147 | create_progress_photos_v1 | Exact local filename exists |
| 20260427075901 | create_health_data_wearables_v1 | Exact local filename exists |
| 20260427080906 | fix_bi_views_security_invoker | Exact local filename exists |
| 20260428063114 | gofit_coach_ai_templates_and_ai_session_notes_v1 | Exact local filename exists |
| 20260428065628 | gofit_small_automated_check_ins_v1 | Exact local filename exists |
| 20260505093744 | create_daily_coach_loop_v1 | Exact local filename exists |
| 20260505093937 | optimize_daily_coach_loop_rls_v1 | Exact local filename exists |
| 20260505094733 | extend_health_data_recovery_metrics_v1 | Exact local filename exists |
| 20260505103700 | extend_nutrition_water_fiber_v1 | Exact local filename exists |
| 20260505141326 | extend_workouts_wellness_categories_v1 | Exact local filename exists |
| 20260505141742 | seed_wellness_native_workouts_v1 | Exact local filename exists |
| 20260505143006 | add_food_item_barcodes_v1 | Exact local filename exists |
| 20260505144857 | add_food_item_source_attribution_v1 | Exact local filename exists |
| 20260505181714 | create_saved_meals_v1 | Exact local filename exists |
| 20260505183505 | add_saved_meal_item_update_policy_v1 | Exact local filename exists |
| 20260505185411 | fix_advisor_function_search_paths_v1 | Exact local filename exists |
| 20260505185453 | add_advisor_missing_fk_indexes_v1 | Exact local filename exists |
| 20260610213453 | restrict_trigger_function_execute_v1 | Exact local filename exists |
| 20260610213918 | fix_advisor_rls_and_storage_policies_v1 | Exact local filename exists |
| 20260610214009 | restrict_authenticated_rpc_execute_v1 | Exact local filename exists |
| 20260610222516 | harden_privileged_rpc_callers_v1 | Exact local filename exists |
| 20260610223335 | harden_client_progress_rpc_v1 | Exact local filename exists |
| 20260611122248 | consolidate_workout_rls_policies_v1 | Exact local filename exists |
| 20260611122358 | optimize_workout_sessions_rls_initplan_v1 | Exact local filename exists |
| 20260611122455 | optimize_health_data_rls_initplan_v1 | Exact local filename exists |
| 20260611122555 | optimize_meal_logs_rls_initplan_v1 | Exact local filename exists |
| 20260611122645 | optimize_progress_photos_rls_initplan_v1 | Exact local filename exists |
| 20260611123818 | optimize_user_profiles_rls_initplan_v1 | Exact local filename exists |
| 20260611124309 | optimize_coach_profiles_rls_initplan_v1 | Exact local filename exists |
| 20260611124420 | optimize_body_measurements_rls_initplan_v1 | Exact local filename exists |
| 20260611124529 | optimize_nutrition_goals_rls_initplan_v1 | Exact local filename exists |
| 20260611124640 | optimize_simple_owner_policies_rls_initplan_v1 | Exact local filename exists |
| 20260611125727 | optimize_coach_certifications_rls_initplan_v1 | Exact local filename exists |
| 20260611125855 | optimize_coach_reviews_rls_initplan_v1 | Exact local filename exists |
| 20260611130249 | optimize_coach_availability_rls_initplan_v1 | Exact local filename exists |
| 20260611130422 | optimize_purchased_packs_rls_initplan_v1 | Exact local filename exists |
| 20260611130740 | optimize_bookings_rls_initplan_v1 | Exact local filename exists |
| 20260611130904 | optimize_custom_programs_rls_initplan_v1 | Exact local filename exists |
| 20260611131152 | optimize_wallets_rls_initplan_v1 | Exact local filename exists |
| 20260611131153 | optimize_transactions_rls_initplan_v1 | Exact local filename exists |
| 20260611131155 | optimize_coach_client_notes_rls_initplan_v1 | Exact local filename exists |
| 20260611205410 | optimize_ai_session_notes_rls_initplan_v1 | Exact local filename exists |
| 20260611205412 | optimize_check_in_responses_rls_initplan_v1 | Exact local filename exists |
| 20260611214538 | optimize_check_in_schedules_rls_initplan_v1 | Exact local filename exists |
| 20260611215057 | optimize_exercises_rls_initplan_v1 | Exact local filename exists |
| 20260611222921 | optimize_admin_audit_logs_rls_initplan_v1 | Exact local filename exists |
| 20260612000039 | optimize_admin_notifications_rls_initplan_v1 | Exact local filename exists |
| 20260612000301 | optimize_session_packs_rls_initplan_v1 | Exact local filename exists |
| 20260612001025 | optimize_conversations_rls_initplan_v1 | Exact local filename exists |
| 20260612110053 | optimize_messages_rls_initplan_v1 | Exact local filename exists |
| 20260612110329 | optimize_admin_settings_rls_initplan_v1 | Exact local filename exists |
| 20260612110850 | consolidate_wallet_select_policies_v1 | Exact local filename exists |
| 20260612111142 | consolidate_transaction_select_policies_v1 | Exact local filename exists |

## Local scripts without an exact recorded name

- add_activity_level_age_gender_columns.sql
- add_admin_role.sql
- add_body_measurement_height_cm.sql
- add_body_measurement_lengths.sql
- add_conversations_enriched_view.sql
- add_display_name_and_public_read.sql
- add_exercise_images.sql
- add_get_client_progress.sql
- add_native_workouts_table.sql
- add_native_workouts_with_day_splits.sql
- add_notification_preferences_column.sql
- add_notifications_insert_policy.sql
- add_profile_picture_column.sql
- add_rest_timer_preferences.sql
- add_user_dietary_preferences_v1.sql
- add_user_type_column.sql
- add_workout_exercises_junction_tables.sql
- add_workout_split_days.sql
- cleanup_old_workout_tables.sql
- create_admin_audit_logs.sql
- create_admin_notifications.sql
- create_bi_client_health_daily_view.sql
- create_bi_coach_ops_daily_view.sql
- create_bi_finance_daily_view.sql
- create_bi_user_lifecycle_daily_view.sql
- create_body_measurements.sql
- create_nutrition_tracking.sql
- enable_realtime_messages.sql
- ensure_conversations_enriched_view.sql
- extend_get_coach_clients.sql
- extend_get_coach_clients_profile_picture.sql
- fix_admin_rls_policies.sql
- fix_calculate_workout_session_stats_reps.sql
- fix_conversations_enriched_security.sql
- fix_function_search_path.sql
- fix_get_client_progress_relationship.sql
- fix_workout_session_stats_reps_parsing.sql
- fix_workout_session_stats_trigger.sql
- fix_workout_structure.sql
- get_conversations_enriched_client_profile.sql
- marketplace_coaches_public_directory_rpc.sql
- migrate_add_exercise_defaults.sql
- remove_old_audit_log_table.sql
- unify_workouts_design.sql

There are 44 such scripts. Live schema inspection confirms that several corresponding structures exist, including base nutrition tables, body measurements, height_cm, profile dietary/notification fields, split-day workout entries, and the unified workout/session relationships. This does not identify the exact script, execution date, or process that produced each structure. No migration was applied or repaired during this verification.

