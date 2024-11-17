---
title: "Adding translated copies of a planar shape modulo 2"
date: 2023-12-26T14:39:07-05:00
draft: true
---



For any sets $A$ and $B$, their _symmetric difference_ $A \Delta B$ is defined as $A \setminus B \cup B \setminus A$. The operator $\Delta$ is commutative and associative. Actually, the collection of all subsets $\mathcal{P}(X)$ of any set $X$ with the operator $\Delta$ forms an abelian group. With this, define the _XOR sum_ of the sets $A_1, A_2, \dots, A_n$ as the sum $A_1 \Delta A_2 \Delta \cdots \Delta A_n$ in this abelian group. 

We have the following theorem.

-------

__Theorem.__ Let $n$ be odd and $I_1, I_2, \dots, I_n$ be intervals of unit length on $\mathbb{R}$. Then their XOR sum have the total length (or, Lebesgue measure) at least 1.

-------

The proof is very simple. Maybe you want to think about its proof before reading the following.

_Proof._ For any bounded subset $S$ of $\mathcal{R}$, define the subset $F(S)$ of $[0, 1)$ as the set of all $x \in [0, 1)$ such that the size of $S \cap (x + \mathbb{Z})$ is odd. Note that the map $F$ preserves the XOR sum. That is, $F$ is a group morphism from bounded subsets of $\mathbb{R}$ to subsets of $[0, 1)$ with $\Delta$ as addition. Now send the XOR sum $S$ of $I_1, I_2, \dots, I_n$ under the map $F$, then we should have $F(S)$ equal to the set $[0, 1)$ with probably some finite number of points excluded. Note that the map $F$ never increases the Lebesgue measure: we have $|F(S)| \leq |S|$ for all $|X|$. The same proof will work for translated copies of unit boxes $[0, 1]^n \subset \mathbb{R}^n$ as well. □

If you ever find this interesting, I have questions for you:

1. Have you seen this theorem somewhere? Given the simplicity of the idea, I suspect that this should have been discovered by at least someone before me.
2. I am now thinking of the following question.

-------

__Question.__ Let $C_1, C_2, \dots, C_n$ be translated copies of a convex body $C \subset \mathbb{R}^d$ where $n$ can be any odd number. Then what is the minimum possible Lebesgue measure of their XOR sum? Note that $n$ is not fixed.

----------

I suspect there is an absolute constant $c$ so that the answer should be at least $c |C|$, but I don't have anything reasonable that supports it. I think the question is hard even with $C$ being a disk in a plane. Feel free to reach out to me about this question, if you find this interesting.
