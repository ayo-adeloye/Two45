create function public.two45_goal_dataset_hash_v3(p_as_of timestamptz) returns text language sql stable security invoker set search_path=public as $$
select encode(extensions.digest(public.two45_goal_training_data_v3(p_as_of)::text,'sha256'),'hex')
$$;
revoke execute on function public.two45_goal_dataset_hash_v3(timestamptz) from public,anon,authenticated;
grant execute on function public.two45_goal_dataset_hash_v3(timestamptz) to service_role;
