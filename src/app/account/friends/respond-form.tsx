"use client";
import {useActionState} from "react";
import {respondFriend} from "./actions";
export default function RespondForm({id}:{id:string}) {
  const [state,action,pending]=useActionState(respondFriend,{});
  return <form action={action}><input type="hidden" name="connectionId" value={id}/><div className="friend-methods"><button className="button" name="response" value="accept" disabled={pending}>承認する</button><button className="button secondary" name="response" value="decline" disabled={pending}>見送る</button></div>{(state.error||state.success)&&<p className="notice" role="status">{state.error||state.success}</p>}</form>;
}
